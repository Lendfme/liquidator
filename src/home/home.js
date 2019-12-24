import React from 'react';
import 'antd/dist/antd.css';
import './home.scss';
import Web3 from 'web3';
import { Button } from 'antd';
import { Pagination } from 'antd';

import {
    get_balance,
    get_allowance,
    get_list_data,
    format_Shortfall,
    handle_list_click,
    input_chang,
    click_liquidate,
    click_max,
    format_bn,
    handle_approve
} from './utils';

import logo from '../images/logo.svg';
import logo_d from '../images/logo-d.png';
import telegram from '../images/telegram.svg';
import twitter from '../images/twitter.svg';
import lock from '../images/lock.svg';

let mMarket_abi = require('../ABIs/moneyMarket.json');
let WETH_abi = require('../ABIs/WETH_ABI.json');
let USDx_abi = require('../ABIs/USDX_ABI.json');
let USDT_abi = require('../ABIs/USDT_ABI.json');
let Liquidate_ABI = require('../ABIs/Liquidate_ABI.json');

let address = require('../ABIs/address_map.json');



export default class Home extends React.Component {
    constructor(porps) {
        super(porps);

        this.state = {
            data: [
                {
                    key: 0,
                    shortfallWeth: '0.00',
                    address: '...',
                    Supply: '0.00',
                    Borrow: '0.00',
                    collateralRate: '0.00%',
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
            amount_to_liquidate: '',
            data_is_ok: false,
            is_btn_enable: true
        }

        this.new_web3 = window.new_web3 = new Web3(Web3.givenProvider || null);
        this.bn = this.new_web3.utils.toBN;

        this.new_web3.eth.net.getNetworkType().then(
            (net_type) => {
                let mMarket = new this.new_web3.eth.Contract(mMarket_abi, address[net_type]['mMarket']);
                let WETH = new this.new_web3.eth.Contract(WETH_abi, address[net_type]['WETH']);
                let USDx = new this.new_web3.eth.Contract(USDx_abi, address[net_type]['USDx']);
                let USDT = new this.new_web3.eth.Contract(USDT_abi, address[net_type]['USDT']);
                let Liquidate = new this.new_web3.eth.Contract(Liquidate_ABI, address[net_type]['liquidator']);

                this.new_web3.givenProvider.enable().then(res_accounts => {
                    this.setState({
                        net_type: net_type,
                        mMarket: mMarket,
                        WETH: WETH,
                        USDx: USDx,
                        USDT: USDT,
                        Liquidate: Liquidate,
                        my_account: res_accounts[0]
                    }, () => {
                        get_balance(this);

                        get_allowance(this, address[this.state.net_type]['liquidator']);

                        this.state.mMarket.methods.assetPrices(address[this.state.net_type]['USDx']).call().then(res_usdx_price => {
                            console.log('res_usdx_price:', res_usdx_price);
                            this.setState({ usdx_price: res_usdx_price }, () => {
                                // this.get_markets();
                                get_list_data(this, 1);
                            })
                        })
                    })
                })
            }
        )
    }





    i_want_received_token = (token) => {
        // console.log(token);
        // this.setState({ i_want_received: token })
        this.state.choosen_item.supply.map(supply_item => {
            if (supply_item.symbol === token) {
                this.setState({
                    i_want_received: token,
                    i_want_received_address: supply_item.asset
                })
            }
        })
    }

    i_want_send_token = (item) => {
        this.setState({
            max_liquidate_amount: '',
            max_liquidate_amount_show: '',
            i_want_send: item.symbol,
            i_want_send_address: item.asset,
            now_new_decimals: item.decimal
        }, () => {
            console.log(this.state.choosen_item);

            var targetAccount = this.state.data[this.state.index].address;
            var assetBorrow = this.state.i_want_send_address;
            var assetCollateral = this.state.i_want_received_address;
            var get_max_api = 'https://test.lendf.me/v1/liquidate?targetAccount=' + targetAccount + '&assetBorrow=' + assetBorrow + '&assetCollateral=' + assetCollateral;

            // console.log(get_max_api)
            fetch(get_max_api)
                .then((res) => { return res.text() })
                .then((data) => {
                    data = JSON.parse(data);
                    console.log(data.maxClose.amountRaw)
                    this.setState({
                        max_liquidate_amount: data.maxClose.amountRaw,
                        max_liquidate_amount_show: data.maxClose.amount
                    })
                })
        });
    }




    change_page = (page, pageSize) => {
        console.log(page, pageSize);
        // this.get_list_data(page);
    }


    click_connect = () => {
        this.new_web3.givenProvider.enable().then(res_accounts => {
            this.setState({ my_account: res_accounts[0] }, () => {
                get_balance(this);
                get_allowance(this, address[this.state.net_type]['liquidator']);

                this.state.mMarket.methods.assetPrices(address[this.state.net_type]['USDx']).call().then(res_usdx_price => {
                    console.log('res_usdx_price:', res_usdx_price);
                    this.setState({ usdx_price: res_usdx_price }, () => {
                        get_list_data(this, 1);
                    })
                })
            })
        })
    }


    render() {
        return (
            <React.Fragment>
                <div className='top'>
                    <div className='top-left'>
                        <img src={logo_d} alt='' />
                    </div>
                    <div className='top-center'>
                        <img src={logo} alt='' />
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
                    <div className='main-body-left'>
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
                                                <tr
                                                    key={item.key}
                                                    onClick={() => { handle_list_click(this, item.key) }}
                                                    className={this.state.index === item.key ? 'active' : ''}
                                                >
                                                    <td className='td-1'>{format_Shortfall(item.shortfallWeth)}</td>
                                                    <td className='td-2'>{item.address.slice(0, 6) + '...' + item.address.slice(-4)}</td>
                                                    <td className='td-3'>{item.Supply}</td>
                                                    <td className='td-4'>{item.Borrow}</td>
                                                    <td className='td-5'>{item.collateralRate}</td>
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>

                        <div className='page'>
                            <Pagination
                                showQuickJumper
                                defaultCurrent={1}
                                total={this.state.totalSize ? this.state.totalSize : 0}
                                onChange={(page, pageSize) => { this.change_page(page, pageSize) }}
                            />
                        </div>
                    </div>


                    <div className='main-body-right'>
                        <div className='main-body-balance'>
                            <h3>Wallet Balances</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Balance</th>
                                        <th>USD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{'ETH'}</td>
                                        <td>
                                            {
                                                this.state.my_eth_balance ?
                                                    format_bn(this.state.my_eth_balance, 18, 2) : '0'
                                            }
                                        </td>
                                        <td>{'$'}</td>
                                    </tr>
                                    <tr>
                                        <td>{'WETH'}</td>
                                        <td>
                                            {
                                                this.state.my_weth_balance ?
                                                    format_bn(this.state.my_weth_balance, 18, 2) : '0'
                                            }
                                        </td>
                                        <td>
                                            {'$'}
                                            {
                                                !this.state.weth_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.WETH, address[this.state.net_type]['liquidator'], 'weth') }} />
                                            }
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>{'USDx'}</td>
                                        <td>
                                            {
                                                this.state.my_usdx_balance ?
                                                    format_bn(this.state.my_usdx_balance, 18, 2) : '0'
                                            }
                                        </td>
                                        <td>
                                            {'$'}
                                            {
                                                !this.state.usdx_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.USDx, address[this.state.net_type]['liquidator'], 'usdx') }} />
                                            }
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>{'USDT'}</td>
                                        <td>
                                            {
                                                this.state.my_usdt_balance ?
                                                    format_bn(this.state.my_usdt_balance, 6, 2) : '0'
                                            }
                                        </td>
                                        <td>
                                            {'$'}
                                            {
                                                !this.state.usdt_approved &&
                                                <img alt='' src={lock} onClick={() => { handle_approve(this, this.state.USDT, address[this.state.net_type]['liquidator'], 'usdt') }} />
                                            }
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className='main-body-details'>
                            <h3>Liquidation</h3>
                            <div className='account'>
                                <span className='account-title'>Account:</span>
                                <span className='account-address'>
                                    {this.state.data[this.state.index].address}
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
                                                return (
                                                    <tr
                                                        key={supply_item.asset}
                                                        onClick={() => { this.i_want_received_token(supply_item.symbol) }}
                                                        className={supply_item.symbol === this.state.i_want_received ? 'active' : ''}
                                                    >
                                                        <td>{supply_item.symbol}</td>
                                                        <td>{format_Shortfall(supply_item.amount)}</td>
                                                    </tr>
                                                )
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
                                            <th className='escpecil'>MAX Liquidation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            this.state.data[this.state.index].borrow &&
                                            this.state.data[this.state.index].borrow.map(borrow_item => {
                                                return (
                                                    <tr
                                                        key={borrow_item.asset}
                                                        onClick={() => { this.i_want_send_token(borrow_item) }}
                                                        className={borrow_item.symbol === this.state.i_want_send ? 'active' : ''}
                                                    >
                                                        <td>{borrow_item.symbol}</td>
                                                        <td>{format_Shortfall(borrow_item.amount)}</td>
                                                        <td className='escpecil'>
                                                            {
                                                                borrow_item.symbol === this.state.i_want_send && this.state.max_liquidate_amount ?
                                                                    format_Shortfall(this.state.max_liquidate_amount_show) : ''
                                                            }
                                                        </td>
                                                    </tr>
                                                )
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
                                        <input
                                            placeholder='number'
                                            type='number'
                                            onChange={(e) => { input_chang(this, e.target.value) }}
                                            value={this.state.amount_to_liquidate}
                                        />
                                        <span className='max-tips' onClick={() => { click_max(this) }}>MAX</span>
                                    </div>
                                    <div className='button-wrap'>
                                        <Button
                                            onClick={() => { click_liquidate(this) }}
                                            className={this.state.is_btn_enable ? null : 'disable-button'}
                                        >
                                            Liquidate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>



                    <div className='clear'></div>
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
