const IND = [
    { date: '2025-11-25', period: '季度', currency: 'CNY', region: '北京', department: '零售银行部', organization: 'head', balance: '1,523,456,789.00' },
    { date: '2025-11-25', period: '季度', currency: 'USD', region: '北京', department: '零售银行部', organization: 'head', balance: '234,567,890.00' },
    { date: '2025-11-25', period: '季度', currency: 'CNY', region: '上海', department: '零售银行部', organization: 'head', balance: '876,543,210.00' },
    { date: '2025-11-25', period: '季度', currency: 'USD', region: '上海', department: '零售银行部', organization: 'head', balance: '123,456,789.00' },
    { date: '2025-11-25', period: '季度', currency: 'EUR', region: '上海', department: '零售银行部', organization: 'head', balance: '56,789,012.00' },
    { date: '2025-11-25', period: '季度', currency: 'CNY', region: '广州', department: '零售银行部', organization: 'head', balance: '987,654,321.00' },
    { date: '2025-11-25', period: '季度', currency: 'HKD', region: '广州', department: '零售银行部', organization: 'head', balance: '456,789,012.00' },
    { date: '2025-11-25', period: '日', currency: 'USD', region: '北京', department: '零售银行部', organization: 'head', balance: '345,678,901.00' }
];

function sumByCurrency(data, currency) {
    const filtered = data.filter(i => (i.currency || '').toString().toUpperCase() === currency.toUpperCase());
    const total = filtered.reduce((s, item) => {
        const num = parseFloat((item.balance||'').toString().replace(/[^\d.-]/g, '')) || 0;
        return s + num;
    }, 0);
    return total;
}

const cny = sumByCurrency(IND, 'CNY');
const usd = sumByCurrency(IND, 'USD');
const all = IND.reduce((s,i)=> s + (parseFloat((i.balance||'').toString().replace(/[^\d.-]/g,''))||0),0);
console.log('CNY total:', cny.toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2}));
console.log('USD total:', usd.toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2}));
console.log('All total:', all.toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2}));
