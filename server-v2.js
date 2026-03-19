const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// 解析JSON
app.use(express.json());

// 静态文件服务
app.use(express.static(__dirname));

// 抓取数据的API
app.get('/api/fetch-data', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: '缺少URL参数' });
    }

    try {
        console.log('开始抓取:', url);
        
        // 获取网页内容
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            },
            timeout: 30000,
            maxRedirects: 5
        });

        console.log('抓取成功，开始解析...');
        const $ = cheerio.load(response.data);

        // 解析数据
        const cities = parseData($);

        console.log(`解析完成，共${cities.length}个城市`);

        res.json({
            success: true,
            cities: cities
        });

    } catch (error) {
        console.error('抓取数据失败:', error.message);
        res.status(500).json({
            error: '数据抓取失败',
            message: error.message
        });
    }
});

// 解析HTML数据
function parseData($) {
    const cities = [];
    
    // 70个城市列表
    const all70Cities = [
        '北京', '天津', '石家庄', '太原', '呼和浩特',
        '沈阳', '大连', '长春', '哈尔滨',
        '上海', '南京', '无锡', '徐州', '杭州', '宁波', '温州', '合肥', '福州', '厦门', '南昌', '济南', '青岛', '郑州', '武汉', '长沙', '南宁',
        '广州', '深圳', '海口',
        '重庆', '成都', '贵阳', '昆明', '西安', '兰州', '西宁', '银川', '乌鲁木齐',
        '唐山', '秦皇岛', '包头', '丹东', '锦州', '吉林', '牡丹江', '常州', '扬州', '金华', '蚌埠', '安庆', '泉州', '九江', '赣州', '烟台', '济宁', '洛阳', '平顶山', '宜昌', '襄阳', '岳阳', '常德', '韶关', '湛江', '惠州', '桂林', '北海', '三亚', '泸州', '南充', '遵义', '大理'
    ];

    const newHouseData = {};
    const oldHouseData = {};

    // 查找所有表格
    const tables = $('table');
    console.log('找到表格数量:', tables.length);

    // 遍历表格
    tables.each((tableIndex, table) => {
        const rows = $(table).find('tr');
        
        // 跳过表头行
        if (rows.length < 3) return;
        
        // 判断是新房还是二手房表格
        // 根据测试结果：表格1-2是新房和二手房的基础数据
        let isNewHouse = false;
        let isOldHouse = false;
        
        // 通过上下文判断
        const prevText = $(table).prevAll('p, h3, h4, div').first().text();
        const tableText = $(table).text();
        
        // 简单判断：前两个表格是基础数据
        if (tableIndex === 0 || tableIndex === 1) {
            // 表格1是新房，表格2是二手房（需要根据实际情况调整）
            isNewHouse = (tableIndex === 0);
            isOldHouse = (tableIndex === 1);
        } else {
            return; // 跳过其他表格
        }
        
        console.log(`表格${tableIndex}: ${isNewHouse ? '新房' : isOldHouse ? '二手房' : '未知'}`);
        
        // 解析数据行
        rows.slice(2).each((rowIndex, row) => {
            const cells = $(row).find('td');
            if (cells.length < 8) return;
            
            // 左栏城市（前4列）
            let leftCityName = $(cells[0]).text().trim().replace(/\s+/g, '');
            const leftMonthIndex = parseFloat($(cells[1]).text().trim()) || 100;
            const leftYearIndex = parseFloat($(cells[2]).text().trim()) || 100;
            
            // 右栏城市（后4列）
            let rightCityName = $(cells[4]).text().trim().replace(/\s+/g, '');
            const rightMonthIndex = parseFloat($(cells[5]).text().trim()) || 100;
            const rightYearIndex = parseFloat($(cells[6]).text().trim()) || 100;
            
            // 匹配城市名
            const leftMatch = all70Cities.find(c => leftCityName.includes(c) || c.includes(leftCityName));
            const rightMatch = all70Cities.find(c => rightCityName.includes(c) || c.includes(rightCityName));
            
            // 存储数据
            if (leftMatch) {
                const data = {
                    name: leftMatch,
                    monthIndex: leftMonthIndex,
                    yearIndex: leftYearIndex,
                    monthRank: 0,
                    yearRank: 0
                };
                if (isNewHouse) {
                    newHouseData[leftMatch] = data;
                } else if (isOldHouse) {
                    oldHouseData[leftMatch] = data;
                }
            }
            
            if (rightMatch) {
                const data = {
                    name: rightMatch,
                    monthIndex: rightMonthIndex,
                    yearIndex: rightYearIndex,
                    monthRank: 0,
                    yearRank: 0
                };
                if (isNewHouse) {
                    newHouseData[rightMatch] = data;
                } else if (isOldHouse) {
                    oldHouseData[rightMatch] = data;
                }
            }
        });
    });

    // 合并数据
    all70Cities.forEach(cityName => {
        const newHouse = newHouseData[cityName];
        const oldHouse = oldHouseData[cityName];

        if (newHouse || oldHouse) {
            cities.push({
                name: cityName,
                newHouseMonthIndex: newHouse ? newHouse.monthIndex : 100,
                newHouseYearIndex: newHouse ? newHouse.yearIndex : 100,
                newHouseMonthRank: 0,
                newHouseYearRank: 0,
                oldHouseMonthIndex: oldHouse ? oldHouse.monthIndex : 100,
                oldHouseYearIndex: oldHouse ? oldHouse.yearIndex : 100,
                oldHouseMonthRank: 0,
                oldHouseYearRank: 0
            });
        }
    });

    // 计算排名
    calculateRankings(cities);

    return cities;
}

// 计算排名（使用标准竞赛排名法：相同指数排名相同，下一个排名跳过）
function calculateRankings(cities) {
    // 新房环比排名
    const sortedByNewMonth = [...cities].sort((a, b) => {
        if (b.newHouseMonthIndex !== a.newHouseMonthIndex) {
            return b.newHouseMonthIndex - a.newHouseMonthIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });
    
    let currentRank = 0;
    let sameCount = 0;
    let lastValue = null;
    
    sortedByNewMonth.forEach((city, index) => {
        if (lastValue !== city.newHouseMonthIndex) {
            currentRank = index + 1;
            lastValue = city.newHouseMonthIndex;
        }
        city.newHouseMonthRank = currentRank;
    });

    // 新房同比排名
    const sortedByNewYear = [...cities].sort((a, b) => {
        if (b.newHouseYearIndex !== a.newHouseYearIndex) {
            return b.newHouseYearIndex - a.newHouseYearIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });
    
    currentRank = 0;
    lastValue = null;
    
    sortedByNewYear.forEach((city, index) => {
        if (lastValue !== city.newHouseYearIndex) {
            currentRank = index + 1;
            lastValue = city.newHouseYearIndex;
        }
        city.newHouseYearRank = currentRank;
    });

    // 二手房环比排名
    const sortedByOldMonth = [...cities].sort((a, b) => {
        if (b.oldHouseMonthIndex !== a.oldHouseMonthIndex) {
            return b.oldHouseMonthIndex - a.oldHouseMonthIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });
    
    currentRank = 0;
    lastValue = null;
    
    sortedByOldMonth.forEach((city, index) => {
        if (lastValue !== city.oldHouseMonthIndex) {
            currentRank = index + 1;
            lastValue = city.oldHouseMonthIndex;
        }
        city.oldHouseMonthRank = currentRank;
    });

    // 二手房同比排名
    const sortedByOldYear = [...cities].sort((a, b) => {
        if (b.oldHouseYearIndex !== a.oldHouseYearIndex) {
            return b.oldHouseYearIndex - a.oldHouseYearIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });
    
    currentRank = 0;
    lastValue = null;
    
    sortedByOldYear.forEach((city, index) => {
        if (lastValue !== city.oldHouseYearIndex) {
            currentRank = index + 1;
            lastValue = city.oldHouseYearIndex;
        }
        city.oldHouseYearRank = currentRank;
    });
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  70城价格指数通报工具已启动`);
    console.log(`  访问地址: http://localhost:${PORT}`);
    console.log(`========================================`);
});