// 全局变量
let allCityData = []; // 本月数据
let lastMonthCityData = []; // 上月数据
let cityData = [];
let selectedCities = [];
let currentYear = '';
let currentMonth = '';

// 23个重点城市（固定）
const keyCities = [
    '西安', '重庆', '成都', '昆明', '贵阳', '南宁',
    '北京', '天津', '沈阳', '上海', '南京', '杭州',
    '宁波', '合肥', '福州', '厦门', '济南', '青岛',
    '郑州', '武汉', '长沙', '广州', '深圳'
];

// 初始化城市复选框
function initCityCheckboxes() {
    const container = document.getElementById('cityCheckboxes');
    container.innerHTML = '';

    keyCities.forEach(city => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${city}" onchange="toggleCity('${city}')">
            ${city}
        `;
        container.appendChild(label);
    });
}

// 切换城市选择
function toggleCity(city) {
    const checkbox = document.querySelector(`input[value="${city}"]`);
    const label = checkbox.parentElement;

    if (checkbox.checked) {
        selectedCities.push(city);
        label.classList.add('checked');
    } else {
        selectedCities = selectedCities.filter(c => c !== city);
        label.classList.remove('checked');
    }
}

// 抓取数据
async function fetchData() {
    const urlInput = document.getElementById('urlInput');
    const lastMonthUrlInput = document.getElementById('lastMonthUrlInput');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const result = document.getElementById('result');

    const url = urlInput.value.trim();
    const lastMonthUrl = lastMonthUrlInput.value.trim();

    if (!url) {
        showError('请输入本月国家统计局网址');
        return;
    }

    // 解析月份 - 支持多种格式
    let monthMatch = url.match(/(\d{4})年(\d{1,2})月/);
    if (!monthMatch) {
        monthMatch = url.match(/(\d{4})(\d{2})/);
    }
    if (!monthMatch) {
        monthMatch = url.match(/t(\d{4})/);
    }

    if (monthMatch) {
        currentYear = monthMatch[1];
        let month = parseInt(monthMatch[2] || '01');
        
        // 往前推一个月（公布时间是下个月，实际数据是上个月）
        month = month - 1;
        if (month === 0) {
            month = 12;
            currentYear = (parseInt(currentYear) - 1).toString();
        }
        
        currentMonth = month.toString().padStart(2, '0');
    }

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    result.classList.add('hidden');

    try {
        // 从服务器抓取本月数据
        const response = await fetch(`/api/fetch-data?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error('数据抓取请求失败');
        }

        const data = await response.json();

        if (!data || !data.success || !data.cities || data.cities.length === 0) {
            throw new Error('未获取到有效数据');
        }

        allCityData = data.cities;
        cityData = data.cities;
        
        // 如果提供了上个月网址，抓取上月数据
        if (lastMonthUrl) {
            try {
                const lastMonthResponse = await fetch(`/api/fetch-data?url=${encodeURIComponent(lastMonthUrl)}`);
                
                if (lastMonthResponse.ok) {
                    const lastMonthData = await lastMonthResponse.json();
                    if (lastMonthData && lastMonthData.success && lastMonthData.cities) {
                        lastMonthCityData = lastMonthData.cities;
                        console.log('成功抓取上月数据，共', lastMonthCityData.length, '个城市');
                    }
                }
            } catch (err) {
                console.warn('上月数据抓取失败，将无法对比排名变化:', err.message);
            }
        } else {
            lastMonthCityData = [];
        }

        // 清空之前的选择
        selectedCities = [];
        initCityCheckboxes();

        result.classList.remove('hidden');

    } catch (err) {
        console.error('抓取错误:', err);
        showError('数据抓取失败: ' + err.message + '。请确保网址正确，服务器已启动，且网络连接正常。');
    } finally {
        loading.classList.add('hidden');
    }
}

// 显示错误
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.remove('hidden');
}

// 生成通报
function generateReport() {
    if (selectedCities.length === 0) {
        alert('请至少选择一个城市');
        return;
    }

    // 生成文字通报
    generateTextReport();

    // 生成表格
    generateTable();
}

// 生成文字通报
function generateTextReport() {
    const textReport = document.getElementById('textReport');
    const totalCities = allCityData.length;

    // 计算新房环比统计
    const newHouseMonthUp = allCityData.filter(c => c.newHouseMonthIndex > 100).length;
    const newHouseMonthFlat = allCityData.filter(c => c.newHouseMonthIndex === 100).length;
    const newHouseMonthDown = allCityData.filter(c => c.newHouseMonthIndex < 100).length;
    
    // 计算新房同比统计
    const newHouseYearUp = allCityData.filter(c => c.newHouseYearIndex > 100).length;
    const newHouseYearFlat = allCityData.filter(c => c.newHouseYearIndex === 100).length;
    const newHouseYearDown = allCityData.filter(c => c.newHouseYearIndex < 100).length;
    const newHouseYearUpCities = allCityData.filter(c => c.newHouseYearIndex > 100).slice(0, 5).map(c => c.name).join('、');
    
    // 计算二手房环比统计
    const oldHouseMonthUp = allCityData.filter(c => c.oldHouseMonthIndex > 100).length;
    const oldHouseMonthFlat = allCityData.filter(c => c.oldHouseMonthIndex === 100).length;
    const oldHouseMonthDown = allCityData.filter(c => c.oldHouseMonthIndex < 100).length;
    
    // 计算二手房同比统计
    const oldHouseYearUp = allCityData.filter(c => c.oldHouseYearIndex > 100).length;
    const oldHouseYearFlat = allCityData.filter(c => c.oldHouseYearIndex === 100).length;
    const oldHouseYearDown = allCityData.filter(c => c.oldHouseYearIndex < 100).length;

    // 生成报告
    let report = `国家统计局70城${currentYear.substring(2)}年${currentMonth}月房价指数公布：

新房市场：环比指数${newHouseMonthUp}城上涨、${newHouseMonthFlat}城持平、${newHouseMonthDown}城下降；同比指数${newHouseYearUpCities}等${newHouseYearUp}城上涨，${newHouseYearFlat}城持平，${newHouseYearDown}城下降；
二手房市场：环比指数${oldHouseMonthUp}城上涨、${oldHouseMonthFlat}城持平、${oldHouseMonthDown}城下降；同比指数${oldHouseYearUp}城上涨、${oldHouseYearFlat}城持平、${oldHouseYearDown}城下降。`;

    // 为每个选中的城市生成详细数据
    selectedCities.forEach(cityName => {
        const city = allCityData.find(c => c.name === cityName);
        if (!city) return;

        // 获取上月数据
        const lastMonthCity = lastMonthCityData.find(c => c.name === cityName);
        
        // 计算排名变化
        let newHouseMonthRankChange = '持平';
        let newHouseYearRankChange = '持平';
        let oldHouseMonthRankChange = '持平';
        let oldHouseYearRankChange = '持平';
        
        if (lastMonthCity) {
            // 新房环比排名变化（排名数字变小=上升，变大=下降）
            if (city.newHouseMonthRank < lastMonthCity.newHouseMonthRank) {
                newHouseMonthRankChange = '上升';
            } else if (city.newHouseMonthRank > lastMonthCity.newHouseMonthRank) {
                newHouseMonthRankChange = '下降';
            }
            
            // 新房同比排名变化
            if (city.newHouseYearRank < lastMonthCity.newHouseYearRank) {
                newHouseYearRankChange = '上升';
            } else if (city.newHouseYearRank > lastMonthCity.newHouseYearRank) {
                newHouseYearRankChange = '下降';
            }
            
            // 二手房环比排名变化
            if (city.oldHouseMonthRank < lastMonthCity.oldHouseMonthRank) {
                oldHouseMonthRankChange = '上升';
            } else if (city.oldHouseMonthRank > lastMonthCity.oldHouseMonthRank) {
                oldHouseMonthRankChange = '下降';
            }
            
            // 二手房同比排名变化
            if (city.oldHouseYearRank < lastMonthCity.oldHouseYearRank) {
                oldHouseYearRankChange = '上升';
            } else if (city.oldHouseYearRank > lastMonthCity.oldHouseYearRank) {
                oldHouseYearRankChange = '下降';
            }
        }

        report += `

【${cityName}】`;
        report += `新房价格指数环比排名${newHouseMonthRankChange}、同比排名${newHouseYearRankChange}；`;
        report += `二手房价格指数环比排名${oldHouseMonthRankChange}、同比排名${oldHouseYearRankChange}；`;
        report += `新房环比指数${city.newHouseMonthIndex.toFixed(1)}、排名${city.newHouseMonthRank}；`;
        report += `同比指数${city.newHouseYearIndex.toFixed(1)}、排名${city.newHouseYearRank}；`;
        report += `二手房环比指数${city.oldHouseMonthIndex.toFixed(1)}、排名${city.oldHouseMonthRank}；`;
        report += `同比指数${city.oldHouseYearIndex.toFixed(1)}、排名${city.oldHouseYearRank}；`;
    });

    textReport.textContent = report;
}

// 生成表格
function generateTable() {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // 更新表格标题
    const tableTitle = document.querySelector('.table-report h3');
    if (tableTitle) {
        tableTitle.textContent = `国家统计局${currentYear}年${currentMonth}月主要城市商品住宅销售价格分类指数`;
    }

    // 生成表头
    tableHeader.innerHTML = `
        <tr>
            <th rowspan="2">城市</th>
            <th colspan="4">新房价格指数</th>
            <th colspan="4">二手房价格指数</th>
        </tr>
        <tr>
            <th>环比指数</th>
            <th>环比排名</th>
            <th>同比指数</th>
            <th>同比排名</th>
            <th>环比指数</th>
            <th>环比排名</th>
            <th>同比指数</th>
            <th>同比排名</th>
        </tr>
    `;

    // 生成表格内容
    tableBody.innerHTML = '';

    keyCities.forEach(cityName => {
        const city = allCityData.find(c => c.name === cityName);
        if (!city) return;

        const isSelected = selectedCities.includes(cityName);
        const rowClass = isSelected ? 'selected-city' : '';

        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td class="header-cell">${cityName}</td>
            <td>${city.newHouseMonthIndex.toFixed(1)}</td>
            <td>${city.newHouseMonthRank}</td>
            <td>${city.newHouseYearIndex.toFixed(1)}</td>
            <td>${city.newHouseYearRank}</td>
            <td>${city.oldHouseMonthIndex.toFixed(1)}</td>
            <td>${city.oldHouseMonthRank}</td>
            <td>${city.oldHouseYearIndex.toFixed(1)}</td>
            <td>${city.oldHouseYearRank}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 复制文字
function copyText() {
    const textReport = document.getElementById('textReport');
    const text = textReport.textContent;

    navigator.clipboard.writeText(text).then(() => {
        alert('文字已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动选择文字复制');
    });
}

// 下载图片（表格截图）
async function downloadImage() {
    const tableContainer = document.getElementById('tableContainer');

    try {
        // 使用 html2canvas 将表格转换为图片
        const canvas = await html2canvas(tableContainer, {
            scale: 2, // 提高清晰度
            backgroundColor: '#ffffff',
            logging: false
        });

        const link = document.createElement('a');
        link.download = `70城房价指数_${currentYear}年${currentMonth}月.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('下载失败:', err);
        alert('图片下载失败，请尝试截图保存');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initCityCheckboxes();
});