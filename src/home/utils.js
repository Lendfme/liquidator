let address_map = require('../ABIs/address_map.json');


export const get_balance = (that) => {
    that.state.USDx.methods.balanceOf(that.state.my_account).call((err, res_usdx_balance) => {
        that.setState({ my_usdx_balance: res_usdx_balance });
    })
    that.state.WETH.methods.balanceOf(that.state.my_account).call((err, res_weth_balance) => {
        that.setState({ my_weth_balance: res_weth_balance });
    })
    that.state.USDT.methods.balanceOf(that.state.my_account).call((err, res_usdt_balance) => {
        that.setState({ my_usdt_balance: res_usdt_balance });
    })
    that.new_web3.eth.getBalance(that.state.my_account, (err, res_eth_balance) => {
        that.setState({ my_eth_balance: res_eth_balance });
    });
}


export const get_allowance = (that, address_liquidator) => {
    that.state.USDx.methods.allowance(that.state.my_account, address_liquidator).call((err, res_usdx_allowance) => {
        if (that.bn(res_usdx_allowance).gt(that.bn('0'))) {
            // console.log('res_allowance: yyy ', res_allowance);
            that.setState({ usdx_approved: true });
        } else {
            // console.log('res_allowance: nnn ', res_allowance);
            that.setState({ usdx_approved: false });
        }
    });
    that.state.WETH.methods.allowance(that.state.my_account, address_liquidator).call((err, res_weth_allowance) => {
        if (that.bn(res_weth_allowance).gt(that.bn('0'))) {
            // console.log('res_allowance: yyy ', res_allowance);
            that.setState({ weth_approved: true });
        } else {
            // console.log('res_allowance: nnn ', res_allowance);
            that.setState({ weth_approved: false });
        }
    });
    that.state.USDT.methods.allowance(that.state.my_account, address_liquidator).call((err, res_usdt_allowance) => {
        if (that.bn(res_usdt_allowance).gt(that.bn('0'))) {
            // console.log('res_allowance: yyy ', res_allowance);
            that.setState({ usdt_approved: true });
        } else {
            // console.log('res_allowance: nnn ', res_allowance);
            that.setState({ usdt_approved: false });
        }
    });
}


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


export const handle_approve = (that, token_contract, address_liquidator, token) => {
    token_contract.methods.approve(address_liquidator, -1).estimateGas(
        { from: that.state.my_account }, (err, gasLimit) => {
            that.new_web3.eth.getGasPrice((err, gasPrice) => {
                console.log('supply_gasLimit: ', gasLimit);
                console.log('supply_gasPrice: ', gasPrice);
                token_contract.methods.approve(address_liquidator, -1).send(
                    {
                        from: that.state.my_account,
                        gas: Math.ceil(gasLimit * 1.3),
                        gasPrice: gasPrice
                    }, (reject, res_hash) => {
                        if (res_hash) {
                            console.log(res_hash);
                            let check_approve = setInterval(() => {
                                console.log('check approve ', token);
                                that.new_web3.eth.getTransactionReceipt(res_hash, (res_fail, res_success) => {
                                    if (res_success) {
                                        clearInterval(check_approve);
                                        if (res_success.status === true) {
                                            if (token === 'weth') {
                                                that.setState({ weth_approved: true })
                                            } else if (token === 'usdx') {
                                                that.setState({ usdx_approved: true })
                                            } else if (token === 'usdt') {
                                                that.setState({ usdt_approved: true })
                                            }
                                        }
                                    }
                                    if (res_fail) {
                                        console.log(res_fail);
                                        clearInterval(check_approve);
                                        if (token === 'weth') {
                                            that.setState({ weth_approved: false })
                                        } else if (token === 'usdx') {
                                            that.setState({ usdx_approved: false })
                                        } else if (token === 'usdt') {
                                            that.setState({ usdt_approved: false })
                                        }
                                    }
                                })
                            }, 2000)
                        }
                        if (reject) {
                            console.log(reject)
                        }
                    }
                )
            })
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
        is_btn_enable: true,
    })


}


export const click_liquidate = (that) => {
    if (!that.state.data_is_ok || !that.state.is_btn_enable || !that.state.amount_to_liquidate) {
        console.log('i return you.')
        return false;
    }


    var tar_address = that.state.data[that.state.index].address; // 要清算的目标账户
    var tar_amount_to_liquidate = that.state.amount_to_liquidate; // 请求清算的数量
    var tar_borrow = address_map[that.state.net_type][that.state.i_want_send];
    var tar_supply = address_map[that.state.net_type][that.state.i_want_received];

    console.log('要清算的目标账户: ', tar_address)
    console.log('请求清算的数量 :', tar_amount_to_liquidate)
    console.log('目标账户 borrow: ', tar_borrow)
    console.log('目标账户 supply: ', tar_supply)

    var last_argus;
    if (that.state.i_will_liquidate_max) {
        last_argus = that.state.max_liquidate_amount;
    } else {
        if (tar_amount_to_liquidate.indexOf('.') > 0) {
            var temp_value = tar_amount_to_liquidate;
            var t_num = temp_value.split('.')[1].length;
            temp_value = temp_value.substr(0, temp_value.indexOf('.')) + temp_value.substr(temp_value.indexOf('.') + 1);
            last_argus = that.bn(temp_value).mul(that.bn(10 ** (that.state.decimals[that.state.i_want_send] - t_num))).toString();
        } else {
            last_argus = that.bn(tar_amount_to_liquidate).mul(that.bn(10 ** that.state.decimals[that.state.i_want_send]))
        }
    }

    console.log('last_argus: ', last_argus);

    that.state.Liquidate.methods.liquidateBorrow(tar_address, tar_borrow, tar_supply, last_argus).estimateGas(
        { from: that.state.my_account }, (err, gasLimit) => {
            that.new_web3.eth.getGasPrice((err, gasPrice) => {
                console.log('supply_gasLimit: ', gasLimit);
                console.log('supply_gasPrice: ', gasPrice);
                that.state.Liquidate.methods.liquidateBorrow(tar_address, tar_borrow, tar_supply, last_argus).send(
                    {
                        from: that.state.my_account,
                        gas: Math.ceil(gasLimit * 1.3),
                        gasPrice: gasPrice
                    }, (reject, res_hash) => {
                        if (res_hash) {
                            console.log(res_hash);
                            let check_Liquidate = setInterval(() => {
                                console.log('check liquidateBorrow ');
                                that.new_web3.eth.getTransactionReceipt(res_hash, (res_fail, res_success) => {
                                    if (res_success) {
                                        clearInterval(check_Liquidate);
                                        if (res_success.status === true) {
                                            that.setState({
                                                amount_to_liquidate: ''
                                            })
                                        }
                                    }
                                    if (res_fail) {
                                        console.log(res_fail);
                                        clearInterval(check_Liquidate);
                                    }
                                })
                            }, 2000)
                        }
                        if (reject) {
                            console.log(reject)
                        }
                    }
                )
            })
        })
}


export const click_max = (that) => {
    var t_balance = that.state.max_liquidate_amount;
    var to_show;

    console.log(that.state.i_want_send);

    if (that.state.i_want_send === 'USDx' || that.state.i_want_send === 'WETH') {
        console.log(t_balance);
        if (t_balance.length <= 18) {
            to_show = ('0.' + ('000000000000000000' + t_balance).substr(-18)).substring(0, 18);
        } else {
            to_show = (that.bn(t_balance).div(that.bn(10 ** 18)) + '.' + t_balance.substr(-18)).substring(0, 18);
        }
    } else if (that.state.i_want_send === 'USDT') {
        console.log(t_balance);
        if (t_balance.length <= 6) {
            to_show = ('0.' + ('000000000000000000' + t_balance).substr(-6)).substring(0, 6);
        } else {
            to_show = (that.bn(t_balance).div(that.bn(10 ** 6)) + '.' + t_balance.substr(-6)).substring(0, 18);
        }
    }

    that.setState({
        amount_to_liquidate: to_show,
        i_will_liquidate_max: true
    })
}


