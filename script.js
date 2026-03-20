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

    // 从URL自动解析月份 - 支持多种格式
    let monthMatch = url.match(/(\d{4})年(\d{1,2})月/);
    if (!monthMatch) {
        // 匹配tYYYYMM格式，避免误匹配其他8位数字
        monthMatch = url.match(/t(\d{6})/);
        if (monthMatch) {
            const year = monthMatch[1].substring(0, 4);
            const month = monthMatch[1].substring(4, 6);
            monthMatch = [monthMatch[0], year, month];
        }
    }
    if (!monthMatch) {
        // 最后尝试匹配YYYYMM格式
        monthMatch = url.match(/(\d{4})(0[1-9]|1[0-2])/);
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
        console.log('开始抓取数据，URL:', url);
        const response = await fetch(`/api/fetch-data?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            console.error('服务器返回错误:', response.status, response.statusText);
            throw new Error('数据抓取请求失败');
        }

        const data = await response.json();
        console.log('服务器返回数据:', data);

        if (!data || !data.success || !data.cities || data.cities.length === 0) {
            console.error('数据无效:', data);
            let errorMsg = '未获取到有效数据';
            if (data && data.error) {
                errorMsg += `: ${data.error}`;
            }
            throw new Error(errorMsg);
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
    const newHouseYearUpCities = allCityData.filter(c => c.newHouseYearIndex > 100).slice(0, 3).map(c => c.name).join('、');
    
    // 计算二手房环比统计
    const oldHouseMonthUp = allCityData.filter(c => c.oldHouseMonthIndex > 100).length;
    const oldHouseMonthFlat = allCityData.filter(c => c.oldHouseMonthIndex === 100).length;
    const oldHouseMonthDown = allCityData.filter(c => c.oldHouseMonthIndex < 100).length;
    
    // 计算二手房同比统计
    const oldHouseYearUp = allCityData.filter(c => c.oldHouseYearIndex > 100).length;
    const oldHouseYearFlat = allCityData.filter(c => c.oldHouseYearIndex === 100).length;
    const oldHouseYearDown = allCityData.filter(c => c.oldHouseYearIndex < 100).length;

    // 生成全国总结
    let nationalSummary = `国家统计局70城${currentYear.substring(2)}年${currentMonth}月房价指数公布：\n\n`;

    // 新房环比：转换为"X成"格式（70城 = 7成）
    const newHouseMonthUpCheng = Math.round(newHouseMonthUp / 7);

    // 新房环比：灵活多变的分析
    let newHouseMonthDesc = '';
    if (newHouseMonthUp === 0 && newHouseMonthDown >= 65) {
        newHouseMonthDesc = '环比全国普跌';
    } else if (newHouseMonthUp === 0) {
        newHouseMonthDesc = '环比均降';
    } else if (newHouseMonthUp === 1) {
        newHouseMonthDesc = '环比仅1城微涨';
    } else if (newHouseMonthUp === 2) {
        newHouseMonthDesc = '环比2城上涨';
    } else if (newHouseMonthUp === 3) {
        newHouseMonthDesc = '环比仅3城上涨';
    } else if (newHouseMonthUp === 4 || newHouseMonthUp === 5) {
        newHouseMonthDesc = `环比仅${newHouseMonthUp}城上涨`;
    } else if (newHouseMonthUp <= 10) {
        newHouseMonthDesc = `环比上涨城市减少，仅${newHouseMonthUp}城上涨`;
    } else if (newHouseMonthUp <= 20) {
        newHouseMonthDesc = `环比${newHouseMonthUp}城上涨、${newHouseMonthDown}城下降`;
    } else {
        newHouseMonthDesc = `环比${newHouseMonthUp}城上涨、${newHouseMonthDown}城下降`;
    }

    // 新房同比：灵活多变的分析
    let newHouseYearDesc = '';
    if (newHouseYearUp === 0 && newHouseYearDown >= 65) {
        newHouseYearDesc = '同比仍全国普跌';
    } else if (newHouseYearUp === 0) {
        newHouseYearDesc = '同比全国普跌';
    } else if (newHouseYearUp === 1) {
        newHouseYearDesc = '同比仅1城上涨';
    } else if (newHouseYearUp <= 5) {
        newHouseYearDesc = `同比仅${newHouseYearUp}城上涨`;
    } else {
        newHouseYearDesc = `同比${newHouseYearUp}城上涨、${newHouseYearDown}城下降`;
    }

    nationalSummary += `全国新房价格${newHouseMonthDesc}，${newHouseYearDesc}；`;

    // 二手房环比：灵活多变的分析
    let oldHouseMonthDesc = '';
    if (oldHouseMonthUp === 0 && oldHouseMonthDown >= 65) {
        oldHouseMonthDesc = '环比全国普跌';
    } else if (oldHouseMonthUp === 0) {
        oldHouseMonthDesc = '环比均降';
    } else if (oldHouseMonthUp === 1) {
        oldHouseMonthDesc = '环比仅1城微涨';
    } else if (oldHouseMonthUp === 2) {
        oldHouseMonthDesc = '环比2城上涨';
    } else if (oldHouseMonthUp === 3) {
        oldHouseMonthDesc = '环比仅3城上涨';
    } else if (oldHouseMonthUp === 4 || oldHouseMonthUp === 5) {
        oldHouseMonthDesc = `环比仅${oldHouseMonthUp}城上涨`;
    } else if (oldHouseMonthUp <= 10) {
        oldHouseMonthDesc = `环比上涨城市减少，仅${oldHouseMonthUp}城上涨`;
    } else if (oldHouseMonthUp <= 20) {
        oldHouseMonthDesc = `环比${oldHouseMonthUp}城上涨、${oldHouseMonthDown}城下降`;
    } else {
        oldHouseMonthDesc = `环比${oldHouseMonthUp}城上涨、${oldHouseMonthDown}城下降`;
    }

    // 二手房同比：类似环比的灵活分析
    let oldHouseYearDesc = '';
    if (oldHouseYearUp === 0 && oldHouseYearDown >= 65) {
        oldHouseYearDesc = '同比仍全国普跌';
    } else if (oldHouseYearUp === 0) {
        oldHouseYearDesc = '同比全国普跌';
    } else if (oldHouseYearUp === 1) {
        oldHouseYearDesc = '同比仅1城上涨';
    } else if (oldHouseYearUp <= 5) {
        oldHouseYearDesc = `同比仅${oldHouseYearUp}城上涨`;
    } else {
        oldHouseYearDesc = `同比${oldHouseYearUp}城上涨、${oldHouseYearDown}城下降`;
    }

    nationalSummary += `全国二手房${oldHouseMonthDesc}，${oldHouseYearDesc}。`;

    let report = nationalSummary;

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

        // 城市名称中间空2个汉字距离（4个空格）
        const spacedCityName = cityName.split('').join('    ');

        report += `

【${cityName}】
${cityName}新房价格环比排名${newHouseMonthRankChange}、同比排名${newHouseYearRankChange}；`;
        report += `二手房价格环比排名${oldHouseMonthRankChange}、同比排名${oldHouseYearRankChange}；`;
        report += `新房环比指数${city.newHouseMonthIndex.toFixed(1)}（排名${city.newHouseMonthRank}）、`;
        report += `同比指数${city.newHouseYearIndex.toFixed(1)}（排名${city.newHouseYearRank}）；`;
        report += `二手房环比指数${city.oldHouseMonthIndex.toFixed(1)}（排名${city.oldHouseMonthRank}）、`;
        report += `同比指数${city.oldHouseYearIndex.toFixed(1)}（排名${city.oldHouseYearRank}）；`;
    });

    textReport.textContent = report;
}

// 生成表格
function generateTable() {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const tableTitle = document.getElementById('tableTitle');

    // 更新表格标题
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

        // 城市名称中间空2格
        const spacedCityName = cityName.split('').join('  ');

        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td class="header-cell">${spacedCityName}</td>
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