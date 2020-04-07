import React from 'react';
import 'antd/dist/antd.css';
import './home.scss';
import { Button, Input } from 'antd';
import { Pagination } from 'antd';

// add i18n.
import { IntlProvider, FormattedMessage } from 'react-intl';
import en_US from '../language/en_US.js';
import zh_CN from '../language/zh_CN';

import {
    open_it_onetherscan,
    get_balance,
    get_allowance,
    get_list_data,
    format_Shortfall,
    handle_list_click,
    input_chang,
    click_liquidate,
    click_max,
    format_bn,
    handle_approve,
    to_ethscan_with_account,
    i_want_received_token,
    i_want_send_token,
    change_page,
    get_main_data_timer,
    format_num_K,
    get_history,
    change_page_history
} from './utils';

import logo from '../images/logo.svg';
import logo_d from '../images/logo-d.png';
import telegram from '../images/telegram.svg';
import twitter from '../images/twitter.svg';
import lock from '../images/lock.svg';
import medium from '../images/medium.svg';
import wrong from '../images/wrong.svg';
import up from '../images/up.svg';
import down from '../images/down.svg';
import back from '../images/back.svg';

let address = require('../ABIs/address_map.json');


export default class homeNoweb3 extends React.Component {
    constructor(porps) {
        super(porps);
        this.state = {
            net_type: 'main',
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
            is_btn_enable: true,
            pageNumber: 1,
            pageSize: 15,
            cur_language: navigator.language === 'zh-CN' ? '中文' : 'English'
        }
    }



    componentDidMount = () => {
        get_main_data_timer(this);
        get_history(this);

        this.update_list_timer = setInterval(() => {
            get_main_data_timer(this);
            get_history(this);
        }, 1000 * 15)
    }


    render() {
        return (
            <IntlProvider locale={'en'} messages={this.state.cur_language === '中文' ? zh_CN : en_US} >
                <React.Fragment>
                    <div className='top'>
                        <div className='top-left'>
                            <a href='https://www.lendf.me/' target='_blank' rel="noopener noreferrer">
                                <img src={logo} alt='' />
                            </a>
                        </div>
                        <div className='top-right'>
                            {
                                !this.state.my_account &&
                                <div className='top-right-btn'>
                                    <FormattedMessage id='Connect' />
                                </div>
                            }
                            {
                                (this.state.net_type && this.state.net_type !== 'main') &&
                                <div className='Wrong'>
                                    <span className={'wrong-wrap'}>
                                        <img src={wrong} alt='' />
                                    </span>
                                    <span className='net-name net-name-wrong'>{'Wrong Network'}</span>
                                </div>
                            }
                            {
                                (this.state.my_account && this.state.net_type === 'main') &&
                                <div className='top-right-account'>
                                    <div className='account' onClick={() => { to_ethscan_with_account(this, this.state.my_account) }}>
                                        <span className={'spot ' + this.state.net_type}></span>
                                        <span className={'account-address'}>
                                            {this.state.my_account.slice(0, 4) + '...' + this.state.my_account.slice(-4)}
                                        </span>
                                    </div>
                                </div>
                            }

                            {/* <div className='Platform'>
                                <span className='Platform-title'>dForce Platform</span>
                                <span className='Platform-img'><img src={down} alt='' /></span>
                            </div> */}
                        </div>
                        <div className='clear'></div>
                    </div>


                    <div className='main-body'>
                        <h3 onClick={() => { this.setState({ show_history: !this.state.show_history }) }} className='h3-switch'>
                            <img src={back} />
                            <span>
                                {
                                    !this.state.show_history ?
                                        'History' : 'Liquidation'
                                }
                            </span>
                        </h3>

                        <div className='main-body-left'>
                            {
                                this.state.show_history &&
                                <>
                                    <div className='main-body-list main-body-list-history'>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th><FormattedMessage id='TX_Hash' /></th>
                                                    <th><FormattedMessage id='Target_Account' /></th>
                                                    <th><FormattedMessage id='Target_Asset' /></th>
                                                    <th><FormattedMessage id='Repay_Amount' /></th>
                                                    <th><FormattedMessage id='Liquidated_Asset' /></th>
                                                    <th><FormattedMessage id='Liquidated_Amount' /></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    this.state.history &&
                                                    this.state.history.map(item => {
                                                        return (
                                                            <tr key={item.transactionHash}>
                                                                <td onClick={() => { open_it_onetherscan(this, item.transactionHash) }}>
                                                                    {item.transactionHash.slice(0, 4) + '...' + item.transactionHash.slice(-4)}
                                                                </td>
                                                                <td>{item.targetAccount.slice(0, 4) + '...' + item.targetAccount.slice(-4)}</td>
                                                                <td>{item.assetBorrow.symbol}</td>
                                                                <td>{format_Shortfall(item.assetBorrow.amountRepaid)}</td>
                                                                <td>{item.assetCollateral.symbol}</td>
                                                                <td>{format_Shortfall(item.assetCollateral.amountSeized)}</td>
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
                                            pageSize={this.state.pageSize}
                                            defaultCurrent={this.state.pageNumber_history}
                                            total={this.state.totalSize_history ? this.state.totalSize_history : 0}
                                            onChange={(page, pageSize) => { change_page_history(this, page, pageSize) }}
                                        />
                                    </div>
                                </>
                            }

                            {
                                !this.state.show_history &&
                                <>
                                    <div className='main-body-list'>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th><FormattedMessage id='Shortfall' /> (WETH)</th>
                                                    <th><FormattedMessage id='Account' /></th>
                                                    <th><FormattedMessage id='Supply_Balance' />($)</th>
                                                    <th><FormattedMessage id='Borrow_Balance' />($)</th>
                                                    <th><FormattedMessage id='Collateralization_ratio' /></th>
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
                                                                <td>{format_num_K(format_Shortfall(item.shortfallWeth))}</td>
                                                                <td>{item.address.slice(0, 4) + '...' + item.address.slice(-4)}</td>
                                                                <td>{format_num_K(item.Supply)}</td>
                                                                <td>{format_num_K(item.Borrow)}</td>
                                                                <td>{item.collateralRate}</td>
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
                                            pageSize={this.state.pageSize}
                                            defaultCurrent={this.state.pageNumber}
                                            total={this.state.totalSize ? this.state.totalSize : 0}
                                            onChange={(page, pageSize) => { change_page(this, page, pageSize) }}
                                        />
                                    </div>
                                </>
                            }
                        </div>


                        <div className='main-body-right'>
                            <div className='main-body-balance'>
                                <table>
                                    <thead>
                                        <tr>
                                            <th className='th-1'><FormattedMessage id='Asset' /></th>
                                            <th className='th-2'><FormattedMessage id='Balance' /></th>
                                        </tr>
                                    </thead>
                                </table>
                                <div className='body-wrap'>
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td className='td-1'>{'ETH'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'WETH'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'USDx'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'USDT'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'imBTC'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'HBTC'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'USDC'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'TUSD'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'PAX'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'WBTC'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'DSR'}(<a className='chai' href='https://chai.money' target='_blank'>Chai</a>)</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'HUSD'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>

                                            <tr>
                                                <td className='td-1'>{'BUSD'}</td>
                                                <td className='td-2'>...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                            </div>

                            {
                                !this.state.show_history &&
                                <div className='main-body-details'>
                                    <div className='account'>
                                        <span className='account-title'><FormattedMessage id='Account' />:</span>
                                        <span className='account-address' onClick={() => { to_ethscan_with_account(this, this.state.data[this.state.index].address) }}>
                                            {this.state.data[this.state.index].address}
                                        </span>
                                    </div>
                                    <div className='supply-table'>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th><FormattedMessage id='Supply' /></th>
                                                    <th><FormattedMessage id='Amount' /></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    this.state.data[this.state.index].supply &&
                                                    this.state.data[this.state.index].supply.map(supply_item => {
                                                        return (
                                                            <tr
                                                                key={supply_item.asset}
                                                                onClick={() => { i_want_received_token(this, supply_item) }}
                                                                className={supply_item.symbol === this.state.i_want_received ? 'active' : ''}
                                                            >
                                                                <td>{supply_item.symbol}</td>
                                                                <td>{format_num_K(format_Shortfall(supply_item.amount))}</td>
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
                                                    <th><FormattedMessage id='Borrow' /></th>
                                                    <th><FormattedMessage id='Amount' /></th>
                                                    <th className='escpecil'><FormattedMessage id='MAX_Liquidation' /></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    this.state.data[this.state.index].borrow &&
                                                    this.state.data[this.state.index].borrow.map(borrow_item => {
                                                        return (
                                                            <tr
                                                                key={borrow_item.asset}
                                                                onClick={() => { i_want_send_token(this, borrow_item) }}
                                                                className={borrow_item.symbol === this.state.i_want_send ? 'active' : ''}
                                                            >
                                                                <td>{borrow_item.symbol}</td>
                                                                <td>{format_num_K(format_Shortfall(borrow_item.amount))}</td>
                                                                <td className='escpecil'>
                                                                    {
                                                                        borrow_item.symbol === this.state.i_want_send && this.state.max_liquidate_amount ?
                                                                            format_num_K(format_Shortfall(this.state.max_liquidate_amount_show)) : ''
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
                                        <div className='liquidate-title'>
                                            <span><FormattedMessage id='RequestedAmountClose' /></span>
                                            <span style={{ color: '#8472FF' }}>
                                                {
                                                    this.state.i_want_send ?
                                                        ' (' + this.state.i_want_send + ')' : ''
                                                }
                                            </span>
                                        </div>
                                        <div className='liquidate-con'>
                                            <div className='input-wrap'>
                                                <Input disabled={true} />
                                                <span className='max-tips'>MAX</span>
                                            </div>
                                            <div className='button-wrap'>
                                                <Button disabled={true} className={'disable-button'}>
                                                    <FormattedMessage id='LIQUIDATE' />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }

                        </div>
                        <div className='clear'></div>
                    </div>

                    <div className='footer'>
                        <div className='footer-left'>
                            <div className='footer-left-res'>
                                <span className='title'>
                                    <FormattedMessage id='Resource' />
                                </span>
                                <span className='content'>
                                    <a href='https://github.com/Lendfme/liquidator' target='_blank' rel="noopener noreferrer">GitHub</a>
                                </span>
                                <span className='content'>
                                    <a href='https://docs.lendf.me/faq' target='_blank' rel="noopener noreferrer">FAQ</a>
                                </span>
                            </div>

                            <div className='footer-left-pro'>
                                <span className='title'>
                                    <FormattedMessage id='Products' />
                                </span>
                                <span className='content'>
                                    <a href='https://www.lendf.me/' target='_blank' rel="noopener noreferrer">Lendf.me</a>
                                </span>
                                <span className='content'>
                                    <a href='https://markets.lendf.me/' target='_blank' rel="noopener noreferrer">Markets</a>
                                </span>
                            </div>
                        </div>

                        <div className='footer-right'>
                            <a href='https://twitter.com/LendfMe' target='_blank' rel="noopener noreferrer">
                                <img src={twitter} alt='' />
                            </a>
                            <a href='https://medium.com/dforcenet' target='_blank' rel="noopener noreferrer">
                                <img src={medium} alt='' />
                            </a>
                            <a href='https://t.me/dforcenet' target='_blank' rel="noopener noreferrer">
                                <img src={telegram} alt='' />
                            </a>
                            <div className='clear'></div>

                            <div className='footer-right-fixed'>
                                <div className='fixed1'>
                                    {
                                        this.state.cur_language
                                    }
                                </div>
                                <span className='fixed-img'>
                                    <img src={up} alt='' />
                                </span>
                                <div className='fixed2'>
                                    <ul>
                                        <li onClick={() => { this.setState({ cur_language: '中文' }) }}>{'中文'}</li>
                                        <li onClick={() => { this.setState({ cur_language: 'English' }) }}>{'English'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className='clear'></div>
                    </div>

                </React.Fragment >
            </IntlProvider>
        )
    }
}
