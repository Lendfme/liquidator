export const get_usdx_balance = (that) => {
    that.state.USDx.methods.balanceOf(that.state.my_account).call((err, res_usdx_balance) => {
        // console.log('my_usdx_balance: ', this.format_bn(res_usdx_balance, 18, 2));
        that.setState({ my_usdx_balance: res_usdx_balance });
    })
}

export const get_weth_balance = (that) => {
    that.state.WETH.methods.balanceOf(that.state.my_account).call((err, res_weth_balance) => {
        // console.log('res_weth_balance: ', this.format_bn(res_weth_balance, 18, 2));
        that.setState({ my_weth_balance: res_weth_balance });
    })
}


// ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 ***** ***** 分割线 ***** 


export const get_usdx_allowance = (that, address_liquidator) => {
    that.state.USDx.methods.allowance(that.state.my_account, address_liquidator).call((err, res_usdx_allowance) => {
        if (that.bn(res_usdx_allowance).gt(that.bn('0'))) {
            // console.log('res_allowance: yyy ', res_allowance);
            that.setState({ usdx_approved: true });
        } else {
            // console.log('res_allowance: nnn ', res_allowance);
            that.setState({ usdx_approved: false });
        }
    });
}


// ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 ***** ***** 分割线 ***** 


export const get_list_data = (that, num) => {
    that.setState({ data_is_ok: false });

    // https://test.lendf.me/v1/account?pageNumber=1&pageSize=17
    // let list_api = 'https://api.lendf.me/v1/account?pageNumber=' + num + '&pageSize=15';
    let list_api = 'https://test.lendf.me/v1/account?pageNumber=1&pageSize=10';

    fetch(list_api)
        .then((res) => { return res.text() })
        .then((data) => {
            if (data) {
                data = JSON.parse(data);
                var arrList = data.accounts;

                for (var i = 0; i < arrList.length; i++) {
                    arrList[i].key = i;
                    arrList[i].Supply = format_Shortfall(arrList[i].totalSupplyUSD);
                    arrList[i].Borrow = format_Shortfall(arrList[i].totalBorrowUSD);
                    arrList[i].collateralRate = format_persent(arrList[i].collateralRate);
                }

                console.log(arrList);
                that.setState({
                    data: arrList,
                    data_is_ok: true,
                    totalSize: data.request.totalSize,
                    i_want_send: arrList[0].borrow[0].symbol,
                    i_want_received: arrList[0].supply[0].symbol
                }, () => {
                    handle_list_click(that, 0);
                })
            }
        })
}

export const get_markets = () => {
    let markets_api = 'https://api.lendf.me/v1/info?data=markets';

    fetch(markets_api)
        .then((res) => { return res.text() })
        .then((data) => {
            // console.log(JSON.parse(data))
            data = JSON.parse(data);
            this.setState({ markets: data })
        })
}


// ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 *****  ***** 分割线 ***** ***** 分割线 ***** 


export const handle_list_click = (that, key) => {
    // console.log(key)
    // console.log(that.state.data[key])
    if (!that.state.data_is_ok) {
        console.log('i return you.')
        return false;
    }

    that.setState({
        index: key,
        i_want_send: that.state.data[key].borrow[0].symbol,
        i_want_received: that.state.data[key].supply[0].symbol
    }, () => {

        var targetAccount = that.state.data[key].address;
        var assetBorrow = that.state.data[key].borrow[0].asset;
        var assetCollateral = that.state.data[key].supply[0].asset;

        var get_max_api = 'https://test.lendf.me/v1/liquidate?targetAccount=' + targetAccount + '&assetBorrow=' + assetBorrow + '&assetCollateral=' + assetCollateral;

        // console.log(get_max_api)
        fetch(get_max_api)
            .then((res) => { return res.text() })
            .then((data) => {
                data = JSON.parse(data);
                console.log(data.maxClose.amountRaw)
                that.setState({
                    max_liquidate_amount: data.maxClose.amountRaw,
                    max_liquidate_amount_show: data.maxClose.amount
                })
            })

    })
}

//address[this.state.net_type]['address_liquidator']
export const handle_approve_usdx = (that, token_contract, address_liquidator) => {
    token_contract.methods.approve(address_liquidator, -1).send(
        {
            from: that.state.my_account
        }, (reject, res_hash) => {
            if (res_hash) {
                console.log(res_hash);

                let check_approve = setInterval(() => {
                    that.new_web3.eth.getTransactionReceipt(res_hash, (res_fail, res_success) => {
                        if (res_success) {
                            clearInterval(check_approve);
                            if (res_success.status === true) {
                                that.setState({ usdx_approved: true })
                            }
                        }
                        if (res_fail) {
                            console.log(res_fail);
                            clearInterval(check_approve);
                            that.setState({ usdx_approved: false })
                        }
                    })
                }, 2000)
            }
            if (reject) {
                console.log(reject)
            }
        }
    )
}




export const format_bn = (numStr, decimals, decimalPlace = decimals) => {
    numStr = numStr.toLocaleString().replace(/,/g, '');
    var str = (10 ** decimals).toLocaleString().replace(/,/g, '').slice(1);
    var res = (numStr.length > decimals ?
        numStr.slice(0, numStr.length - decimals) + '.' + numStr.slice(numStr.length - decimals) :
        '0.' + str.slice(0, str.length - numStr.length) + numStr).replace(/(0+)$/g, "");
    res = res.slice(-1) === '.' ? res + '00' : res;
    if (decimalPlace === 0)
        return res.slice(0, res.indexOf('.'));
    var length = res.indexOf('.') + 1 + decimalPlace;
    return res.slice(0, length >= res.length ? res.length : length);
}


export const format_Shortfall = (num) => {
    if (Number(num) === 0) {
        return '0';
    }
    var str_num = num.toString();
    if (str_num.indexOf('.') > 0) {
        var part_a = str_num.split('.')[0];
        var part_b = str_num.split('.')[1].slice(0, 6);
        var part_all = part_a + '.' + part_b;
        return part_all.slice(0, 11);
    } else {
        return str_num;
    }
}


export const format_persent = (num) => {
    // var str_num = num.toString();
    return (num * 100).toFixed(2) + '%';
}


export const input_chang = (that, value) => {
    console.log(value);

    if (value.length > 18) {
        return false;
    }

    if (value === null || value === '') {
        console.log("value === null || value === ''")
        that.setState({
            is_btn_enable: true,
            amount_to_liquidate: '',
        });
        return false;
    }

    if (value.indexOf('.') > 0) {
        // console.log("value.indexOf('.') > 0")
        if (value.split('.')[1].length > that.state.decimals[that.state.i_want_send]) {
            that.setState({
                is_btn_enable: false,
                amount_to_liquidate: value,
            });
            return false;
        }

        var amount_bn;
        var temp_value = value;
        var t_num = value.split('.')[1].length;
        temp_value = temp_value.substr(0, temp_value.indexOf('.')) + temp_value.substr(value.indexOf('.') + 1); // '123456'
        amount_bn = that.bn(temp_value).mul(that.bn(10 ** (that.state.decimals[that.state.i_want_send] - t_num))); // bn_'123456'

        console.log(amount_bn.toString())

        if (amount_bn.gt(that.bn(that.state.max_liquidate_amount))) {
            that.setState({
                is_btn_enable: false,
                amount_to_liquidate: value,
            });
            return false;
        }
    } else {
        if (that.bn(value).mul(that.bn(10 ** that.state.decimals[that.state.i_want_send])).gt(that.bn(that.state.max_liquidate_amount))) {
            that.setState({
                is_btn_enable: false,
                amount_to_liquidate: value,
            });
            return false;
        }
    }



    // if (!this.state.i_want_send) {
    //     console.log('i_want_send---no');
    //     return false;
    // } else {
    //     this.setState({ amount_to_liquidate: val })
    // }

    // this.setState({ amount_to_liquidate: val })
    that.setState({
        amount_to_liquidate: value,
        i_will_liquidate_max: false,
        amount_to_liquidate_bn: '',
        is_btn_enable: true,
    })


}

