import React from 'react';
import 'antd/dist/antd.css';
import './home.scss';
import Web3 from 'web3';
import { Button } from 'antd';
import { Pagination } from 'antd';

import logo from '../images/logo.svg';
import telegram from '../images/telegram.svg';
import twitter from '../images/twitter.svg';
import lock from '../images/lock.svg';

let mMarket_abi = require('../ABIs/moneyMarket.json');
let WETH_abi = require('../ABIs/WETH_ABI.json');
let USDx_abi = require('../ABIs/USDX_ABI.json');
let Liquidate_ABI = require('../ABIs/Liquidate_ABI.json');

let address = require('../ABIs/address_map.json');
let tokens_map = require('../ABIs/tokens_map.json');



export default class Home extends React.Component {
    constructor(porps) {
        super(porps);

        this.state = {
            data: [
                {
                    key: 0,
                    Shortfall: '0.00',
                    Account: '...',
                    Supply: '0.00',
                    Borrow: '0.00',
                    Collateralization: '0.00%',
                }
            ],
            index: 0,
            decimals: {
                USDx: 18,
                WETH: 18,
                USDT: 6
            },
            max_liquidate: {
                USDx: {},
                WETH: {},
                USDT: {}
            },
            amount_to_liquidate: ''
        }

        this.new_web3 = window.new_web3 = new Web3(Web3.givenProvider || null);
        this.bn = this.new_web3.utils.toBN;

        this.new_web3.eth.net.getNetworkType().then(
            (net_type) => {
                let mMarket = new this.new_web3.eth.Contract(mMarket_abi, address[net_type]['address_mMarket']);
                let WETH = new this.new_web3.eth.Contract(WETH_abi, address[net_type]['address_WETH']);
                let USDx = new this.new_web3.eth.Contract(USDx_abi, address[net_type]['address_USDx']);
                let Liquidate = new this.new_web3.eth.Contract(Liquidate_ABI, address[net_type]['address_liquidator']);

                this.new_web3.givenProvider.enable().then(res_accounts => {
                    this.setState({
                        net_type: net_type,
                        mMarket: mMarket,
                        WETH: WETH,
                        USDx: USDx,
                        Liquidate: Liquidate,
                        my_account: res_accounts[0]
                    }, () => {
                        this.state.USDx.methods.balanceOf(this.state.my_account).call((err, res_usdx_balance) => {
                            // console.log('my_usdx_balance: ', this.format_bn(res_usdx_balance, 18, 2));
                            this.setState({ my_usdx_balance: res_usdx_balance });
                        })

                        this.state.WETH.methods.balanceOf(this.state.my_account).call((err, res_weth_balance) => {
                            // console.log('res_weth_balance: ', this.format_bn(res_weth_balance, 18, 2));
                            this.setState({ my_weth_balance: res_weth_balance });
                        })

                        this.state.USDx.methods.allowance(this.state.my_account, address[this.state.net_type]['address_liquidator']).call((err, res_allowance) => {
                            if (this.bn(res_allowance).gt(this.bn('0'))) {
                                // console.log('res_allowance: yyy ', res_allowance);
                                this.setState({ usdx_approved: true });
                            } else {
                                // console.log('res_allowance: nnn ', res_allowance);
                                this.setState({ usdx_approved: false });
                            }
                        });

                        this.state.mMarket.methods.assetPrices(address[this.state.net_type]['address_USDx']).call().then(res_usdx_price => {
                            console.log('res_usdx_price:', res_usdx_price);
                            this.setState({ usdx_price: res_usdx_price }, () => {
                                this.get_list_data(1);
                                this.get_markets();
                            })
                        })
                    })
                })
            }
        )
    }



    get_list_data = (num) => {
        this.setState({ data_is_ok: false });

        let api_list = 'https://api.lendf.me/v1/account?pageNumber=' + num + '&pageSize=15';
        fetch(api_list)
            .then((res) => { return res.text() })
            .then((data) => {
                if (data) {
                    data = JSON.parse(data);
                    var arrList = data.accounts;

                    for (var i = 0; i < arrList.length; i++) {
                        // console.log(arrList[i].address);
                        arrList[i].key = i;
                        arrList[i].Shortfall = arrList[i].shortfall_weth;
                        arrList[i].Account = arrList[i].address;
                        arrList[i].Supply = this.format_bn(this.bn(arrList[i].total_supply_weth).mul(this.bn(100)).div(this.bn(this.state.usdx_price)).toString(), 2, 2);
                        arrList[i].Borrow = this.format_bn(this.bn(arrList[i].total_borrow_weth).mul(this.bn(100)).div(this.bn(this.state.usdx_price)).toString(), 2, 2);

                        if (this.bn(arrList[i].total_borrow_weth).toString() === '0') {
                            arrList[i].Collateralization = '0.00%';
                        } else {
                            arrList[i].Collateralization = this.format_bn(this.bn(arrList[i].total_supply_weth).mul(this.bn(10 ** 4)).div(this.bn(arrList[i].total_borrow_weth)).toString(), 2, 2) + '%';
                        }
                    }

                    // console.log(arrList);
                    this.setState({
                        data: arrList,
                        data_is_ok: true
                    })
                }
            })
    }


    get_markets = () => {
        let api_markets = 'https://api.lendf.me/v1/info?data=markets';
        fetch(api_markets)
            .then((res) => { return res.text() })
            .then((data) => {
                console.log(JSON.parse(data))
                this.setState({
                    markets: JSON.parse(data)
                })
            })
    }




    format_Shortfall = (num) => {
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

    format_bn = (numStr, decimals, decimalPlace = decimals) => {
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

    handle_list_click = (key) => {
        // console.log(key)
        if (!this.state.data_is_ok) {
            console.log('i return you.')
            return false;
        }

        this.setState({ index: key }, () => {
            var liquidateAmountWETH = this.bn(this.state.data[key].Shortfall.toString()).mul(this.bn(10 ** 18)).div(this.bn(10 ** 18).add(this.bn(this.state.markets.liquidationDiscount)).sub(this.bn(this.state.markets.collateralRatio))).toString();
            if (liquidateAmountWETH.indexOf('-') === 0) {
                liquidateAmountWETH = liquidateAmountWETH.slice(1);
            }

            this.state.data[key].borrow.map(item => {
                if (item.amount !== '0') {
                    var requestAmount = Math.min(item.amount, Math.floor(liquidateAmountWETH * (10 ** 18) / this.state.markets.markets[item.asset].price));
                    var ttt_num_bn = this.bn(liquidateAmountWETH).mul(this.bn(10 ** 18)).div(this.bn(this.state.markets.markets[item.asset].price));
                    var requestAmount_bn = this.bn(item.amount).lt(ttt_num_bn) ? this.bn(item.amount) : ttt_num_bn;

                    if (tokens_map[this.state.net_type][item.asset] === 'USDx') {
                        this.setState({
                            max_liquidate: {
                                USDx: {
                                    amount: this.format_bn(requestAmount, this.state.decimals.USDx, 2),
                                    amount_bn: requestAmount_bn,
                                    is_choosen: true
                                }
                            }
                        })
                    }
                    if (tokens_map[this.state.net_type][item.asset] === 'USDT') {
                        this.setState({
                            max_liquidate: {
                                USDT: {
                                    amount: this.format_bn(requestAmount, this.state.decimals.USDT, 2),
                                    amount_bn: requestAmount_bn,
                                    is_choosen: true
                                }
                            }
                        })
                    }
                    if (tokens_map[this.state.net_type][item.asset] === 'WETH') {
                        this.setState({
                            max_liquidate: {
                                WETH: {
                                    amount: this.format_bn(requestAmount, this.state.decimals.WETH, 2),
                                    amount_bn: requestAmount_bn,
                                    is_choosen: true
                                }
                            }
                        })
                    }
                }
            })


        })
    }

    handle_approve_usdx = () => {
        this.state.USDx.methods.approve(address[this.state.net_type]['address_liquidator'], -1).send(
            {
                from: this.state.my_account
            }, (reject, res_hash) => {
                if (res_hash) {
                    console.log(res_hash);

                    let check_approve = setInterval(() => {
                        this.new_web3.eth.getTransactionReceipt(res_hash, (res_fail, res_success) => {
                            if (res_success) {
                                clearInterval(check_approve);
                                if (res_success.status === true) {
                                    this.setState({ usdx_approved: true })
                                }
                            }
                            if (res_fail) {
                                console.log(res_fail);
                                clearInterval(check_approve);
                                this.setState({ usdx_approved: false })
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

    input_chang = (val) => {
        // console.log(typeof(val));
        console.log(val); // string

        // if (!this.state.i_want_send) {
        //     console.log('i_want_send---no');
        //     return false;
        // } else {
        //     this.setState({ amount_to_liquidate: val })
        // }

        // this.setState({ amount_to_liquidate: val })
        this.setState({
            amount_to_liquidate: val,
            i_will_liquidate_max: false,
            amount_to_liquidate_bn: ''
        })


    }

    i_want_received_token = (token) => {
        console.log(token);
        this.setState({ i_want_received: token })
    }

    i_want_send_token = (token) => {
        console.log(token);
        this.setState({ i_want_send: token })
    }

    //Liquidate
    click_liquidate = () => {
        console.log(this.state.data[this.state.index].address) // 要清算的目标账户
        var tar_address = this.state.data[this.state.index].address;

        console.log(this.state.amount_to_liquidate) // 请求清算的数量
        var tar_amount_to_liquidate = this.state.amount_to_liquidate * 10000;

        var tar_borrow;

        if (this.state.i_want_send === 'USDx') {
            tar_borrow = address[this.state.net_type]['address_USDx'];
            // console.log(address[this.state.net_type]['address_USDx'])
            if (!this.state.i_will_liquidate_max) {
                tar_amount_to_liquidate = this.bn(tar_amount_to_liquidate).mul(this.bn(10 ** this.state.decimals.USDx))
            }

        }
        if (this.state.i_want_send === 'USDT') {
            tar_borrow = address[this.state.net_type]['address_USDT'];
            // console.log(address[this.state.net_type]['address_USDT'])
            if (!this.state.i_will_liquidate_max) {
                tar_amount_to_liquidate = this.bn(tar_amount_to_liquidate).mul(this.bn(10 ** this.state.decimals.USDT))
            }

        }
        if (this.state.i_want_send === 'WETH') {
            tar_borrow = address[this.state.net_type]['address_WETH'];
            // console.log(address[this.state.net_type]['address_WETH']) // 目标账户借贷资产合约地址
            if (!this.state.i_will_liquidate_max) {
                tar_amount_to_liquidate = this.bn(tar_amount_to_liquidate).mul(this.bn(10 ** this.state.decimals.WETH))
            }

        }




        var tar_supply;
        if (this.state.i_want_received === 'USDx') {
            tar_supply = address[this.state.net_type]['address_USDx'];
            // console.log(address[this.state.net_type]['address_USDx'])
        }
        if (this.state.i_want_received === 'USDT') {
            tar_supply = address[this.state.net_type]['address_USDT'];
            // console.log(address[this.state.net_type]['address_USDT'])
        }
        if (this.state.i_want_received === 'WETH') {
            tar_supply = address[this.state.net_type]['address_WETH'];
            // console.log(address[this.state.net_type]['address_WETH']) // 目标账户抵押资产合约地址
        }

        // console.log(tar_amount_to_liquidate.div(this.bn(100)).toString());
        // return;

        var last_argus;
        if (this.state.i_will_liquidate_max) {
            last_argus = this.state.amount_to_liquidate_bn;
        } else {
            last_argus = tar_amount_to_liquidate.div(this.bn(10000)).toString();
        }
        console.log(last_argus);
        // return;

        this.state.Liquidate.methods.liquidateBorrow(
            tar_address, tar_borrow, tar_supply, last_argus
        ).send(
            { from: this.state.my_account },
            (reject, res_hash) => {
                if (res_hash) {
                    console.log(res_hash);
                }
                if (reject) {
                    console.log(reject)
                }
            }
        )
    }

    change_page = (page, pageSize) => {
        console.log(page, pageSize);
        this.get_list_data(page);
    }

    click_max = () => {
        // console.log(this.state.i_want_send)//max_liquidate
        // console.log(this.state.max_liquidate[this.state.i_want_send].amount_bn.toString());
        var t_balance = this.state.max_liquidate[this.state.i_want_send].amount_bn.toString();
        var to_show;
        console.log(this.state.i_want_send);

        if (this.state.i_want_send === 'USDx' || this.state.i_want_send === 'WETH') {
            console.log(t_balance);
            if (t_balance.length <= 18) {
                to_show = ('0.' + ('000000000000000000' + t_balance).substr(-18)).substring(0, 18);
            } else {
                to_show = (this.bn(t_balance).div(this.bn(10 ** 18)) + '.' + t_balance.substr(-18)).substring(0, 18);
            }
        } else if (this.state.i_want_send === 'USDT') {
            console.log(t_balance);
            if (t_balance.length <= 6) {
                to_show = ('0.' + ('000000000000000000' + t_balance).substr(-6)).substring(0, 6);
            } else {
                to_show = (this.bn(t_balance).div(this.bn(10 ** 6)) + '.' + t_balance.substr(-6)).substring(0, 18);
            }
        }

        this.setState({
            amount_to_liquidate: to_show,
            i_will_liquidate_max: true,
            amount_to_liquidate_bn: t_balance
        })

    }


    render() {
        return (
            <React.Fragment>
                <div className='top'>
                    <div className='top-left'>
                        <div className='logo'>
                            <img src={logo} alt='' />
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>WETH</th>
                                    <th className='i-have-lock'>
                                        USDx
                                        {
                                            !this.state.usdx_approved &&
                                            <img src={lock} alt='' onClick={() => { this.handle_approve_usdx() }} />
                                        }
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{this.state.my_weth_balance ? this.format_bn(this.state.my_weth_balance, 18, 2) : '-'}</td>
                                    <td>{this.state.my_usdx_balance ? this.format_bn(this.state.my_usdx_balance, 18, 2) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className='top-right'>
                        {
                            !this.state.my_account && <div className='top-right-btn'>Connect</div>
                        }
                        {
                            this.state.my_account &&
                            <div className='top-right-account'>{this.state.my_account.slice(0, 6) + '...' + this.state.my_account.slice(-6)}</div>
                        }
                    </div>
                    <div className='clear'></div>
                </div>


                <div className='main-body'>
                    <div className='main-body-list'>
                        <table>
                            <thead>
                                <tr>
                                    <th className='th-1'>Shortfall (WETH)</th>
                                    <th className='th-2'>Account</th>
                                    <th className='th-3'>Supply Balance($)</th>
                                    <th className='th-4'>Borrow Balance($)</th>
                                    <th className='th-5'>Collateralization ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    this.state.data.map(item => {
                                        return (
                                            <tr key={item.key} onClick={() => { this.handle_list_click(item.key) }} className={this.state.index === item.key ? 'active' : ''}>
                                                <td className='td-1'>{this.format_Shortfall(this.format_bn(item.Shortfall, 18, 6))}</td>
                                                <td className='td-2'>{item.Account.slice(0, 4) + '...' + item.Account.slice(-4)}</td>
                                                <td className='td-3'>{item.Supply}</td>
                                                <td className='td-4'>{item.Borrow}</td>
                                                <td className='td-5'>{item.Collateralization}</td>
                                            </tr>
                                        )
                                    })
                                }
                            </tbody>
                        </table>

                        <div className='page'>
                            <Pagination showQuickJumper defaultCurrent={1} total={500} onChange={(page, pageSize) => { this.change_page(page, pageSize) }} />
                        </div>
                    </div>

                    <div className='main-body-details'>
                        <h3>Liquidation</h3>
                        <div className='account'>
                            <span className='account-title'>Account:</span>
                            <span className='account-address'>
                                {this.state.data[this.state.index].Account}
                            </span>
                        </div>
                        <div className='supply-table'>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Supply</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.data[this.state.index].supply &&
                                        this.state.data[this.state.index].supply.map(supply_item => {
                                            if (supply_item.amount !== '0') {
                                                return (
                                                    <tr key={supply_item.asset} onClick={() => { this.i_want_received_token(tokens_map['rinkeby'][supply_item.asset]) }} className={tokens_map['rinkeby'][supply_item.asset] === this.state.i_want_received ? 'active' : ''}>
                                                        <td>{tokens_map['rinkeby'][supply_item.asset]}</td>
                                                        <td>{this.format_bn(supply_item.amount, this.state.decimals[tokens_map['rinkeby'][supply_item.asset]], 2)}</td>
                                                    </tr>
                                                )
                                            }
                                            return supply_item.id;
                                        })
                                    }

                                </tbody>
                            </table>
                        </div>

                        <div className='borrow-table'>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Borrow</th>
                                        <th>Amount</th>
                                        <th>MAX Liquidation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        this.state.data[this.state.index].borrow &&
                                        this.state.data[this.state.index].borrow.map(borrow_item => {
                                            if (borrow_item.amount !== '0') {
                                                return (
                                                    <tr key={borrow_item.asset} onClick={() => { this.i_want_send_token(tokens_map['rinkeby'][borrow_item.asset]) }} className={tokens_map['rinkeby'][borrow_item.asset] === this.state.i_want_send ? 'active' : ''} >
                                                        <td>{tokens_map['rinkeby'][borrow_item.asset]}</td>
                                                        <td>{this.format_bn(borrow_item.amount, this.state.decimals[tokens_map['rinkeby'][borrow_item.asset]], 2)}</td>
                                                        <td>
                                                            {
                                                                this.state.max_liquidate[tokens_map['rinkeby'][borrow_item.asset]] ?
                                                                    this.state.max_liquidate[tokens_map['rinkeby'][borrow_item.asset]].amount : '0.00'
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                            return borrow_item.id;
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>

                        <div className='liquidate'>
                            <span className='liquidate-title'>
                                RequestedAmountClose
                                {
                                    this.state.i_want_send ?
                                        ' (' + this.state.i_want_send + ')' : ''
                                }
                            </span>
                            <div className='liquidate-con'>
                                <div className='input-wrap'>
                                    <input placeholder='number' type='number' onChange={(e) => { this.input_chang(e.target.value) }} value={this.state.amount_to_liquidate} />
                                    <span className='max-tips' onClick={() => { this.click_max() }}>MAX</span>
                                </div>
                                <div className='button-wrap'>
                                    <Button onClick={() => { this.click_liquidate() }}>
                                        Liquidate
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='footer'>
                    <div className='footer-left'>
                        <a href='www.abc.com' target='_blank'>GitHub</a>
                        <a href='www.abc.com' target='_blank'>Docs</a>
                        <a href='www.abc.com' target='_blank'>FAQ</a>
                    </div>

                    <div className='footer-right'>
                        <a href='www.abc.com' target='_blank'><img src={telegram} alt='' /></a>
                        <a href='www.abc.com' target='_blank'><img src={twitter} alt='' /></a>
                    </div>
                    <div className='clear'></div>
                </div>

            </React.Fragment >
        )
    }
}
