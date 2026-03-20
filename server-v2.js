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
        console.log('========== 开始抓取 ==========');
        console.log('URL:', url);

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

        console.log('HTTP状态码:', response.status);
        console.log('数据长度:', response.data.length);
        console.log('抓取成功，开始解析...');
        const $ = cheerio.load(response.data);

        // 检查是否找到表格
        const tables = $('table');
        console.log('找到表格数量:', tables.length);

        if (tables.length === 0) {
            console.log('警告：未找到任何表格');
            console.log('页面内容预览:', response.data.substring(0, 500));
        }

        // 解析数据
        const cities = parseData($);

        console.log(`解析完成，共${cities.length}个城市`);

        if (cities.length === 0) {
            console.log('警告：解析出的城市数据为空');
        } else {
            console.log('前3个城市数据:', cities.slice(0, 3));
        }

        console.log('========== 抓取完成 ==========');

        res.json({
            success: true,
            cities: cities
        });

    } catch (error) {
        console.error('========== 抓取失败 ==========');
        console.error('错误类型:', error.name);
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应头:', error.response.headers);
        }
        console.error('========== 错误结束 ==========');
        res.status(500).json({
            success: false,
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
        console.log(`表格${tableIndex}总行数:`, rows.length);

        // 解析数据行
        rows.slice(2).each((rowIndex, row) => {
            const cells = $(row).find('td');

            // 输出前3行的所有单元格内容用于调试
            if (rowIndex < 3) {
                console.log(`行${rowIndex}: 单元格数=${cells.length}`);
                for (let i = 0; i < cells.length; i++) {
                    console.log(`  单元格${i}:`, $(cells[i]).text().trim());
                }
            }

            if (cells.length < 3) return;

            // 处理双栏结构：一行两个城市，每个城市占3列（城市名、环比、同比）
            // 第一个城市在列0,1,2；第二个城市在列4,5,6

            // 第一个城市
            let cityName = $(cells[0]).text().trim().replace(/\s+/g, '');
            const monthIndex = parseFloat($(cells[1]).text().trim()) || 100;
            const yearIndex = parseFloat($(cells[2]).text().trim()) || 100;

            // 匹配城市名
            const cityMatch = all70Cities.find(c => cityName.includes(c) || c.includes(cityName));

            // 存储第一个城市数据
            if (cityMatch) {
                const data = {
                    name: cityMatch,
                    monthIndex: monthIndex,
                    yearIndex: yearIndex,
                    monthRank: 0,
                    yearRank: 0
                };
                if (isNewHouse) {
                    newHouseData[cityMatch] = data;
                } else if (isOldHouse) {
                    oldHouseData[cityMatch] = data;
                }
            }

            // 第二个城市（从第4列开始）
            if (cells.length >= 6) {
                let city2Name = $(cells[4]).text().trim().replace(/\s+/g, '');
                const month2Index = parseFloat($(cells[5]).text().trim()) || 100;
                const year2Index = parseFloat($(cells[6]).text().trim()) || 100;

                const city2Match = all70Cities.find(c => city2Name.includes(c) || c.includes(city2Name));

                if (city2Match) {
                    const data = {
                        name: city2Match,
                        monthIndex: month2Index,
                        yearIndex: year2Index,
                        monthRank: 0,
                        yearRank: 0
                    };
                    if (isNewHouse) {
                        newHouseData[city2Match] = data;
                    } else if (isOldHouse) {
                        oldHouseData[city2Match] = data;
                    }
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

    // 调试：输出排名范围
    const newMonthRanks = cities.map(c => c.newHouseMonthRank).sort((a, b) => a - b);
    const newYearRanks = cities.map(c => c.newHouseYearRank).sort((a, b) => a - b);
    console.log('新房环比排名范围:', Math.min(...newMonthRanks), '-', Math.max(...newMonthRanks));
    console.log('新房同比排名范围:', Math.min(...newYearRanks), '-', Math.max(...newYearRanks));

    return cities;
}

// 计算排名（使用竞争排名/标准排名：相同值并列，后面跳过占用名次）
function calculateRankings(cities) {
    // 新房环比排名
    const sortedByNewMonth = [...cities].sort((a, b) => {
        if (b.newHouseMonthIndex !== a.newHouseMonthIndex) {
            return b.newHouseMonthIndex - a.newHouseMonthIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });

    let currentRank = 1;
    let lastValue = null;
    let sameValueCount = 1;

    sortedByNewMonth.forEach((city, index) => {
        if (index === 0) {
            city.newHouseMonthRank = 1;
            lastValue = city.newHouseMonthIndex;
            sameValueCount = 1;
        } else {
            if (lastValue !== city.newHouseMonthIndex) {
                // 新的指数值，排名跳过相同值占用的名次
                currentRank += sameValueCount;
                sameValueCount = 1;
            } else {
                // 相同指数的城市，计数+1
                sameValueCount++;
            }
            city.newHouseMonthRank = currentRank;
            lastValue = city.newHouseMonthIndex;
        }
    });

    // 调试：输出新房环比排名分布
    const rankCount = {};
    sortedByNewMonth.forEach(city => {
        const rank = city.newHouseMonthRank;
        rankCount[rank] = (rankCount[rank] || 0) + 1;
    });
    console.log('新房环比排名分布（前10个）:', Object.entries(rankCount).slice(0, 10));

    // 新房同比排名
    const sortedByNewYear = [...cities].sort((a, b) => {
        if (b.newHouseYearIndex !== a.newHouseYearIndex) {
            return b.newHouseYearIndex - a.newHouseYearIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });

    currentRank = 1;
    lastValue = null;
    sameValueCount = 1;

    sortedByNewYear.forEach((city, index) => {
        if (index === 0) {
            city.newHouseYearRank = 1;
            lastValue = city.newHouseYearIndex;
            sameValueCount = 1;
        } else {
            if (lastValue !== city.newHouseYearIndex) {
                // 新的指数值，排名跳过相同值占用的名次
                currentRank += sameValueCount;
                sameValueCount = 1;
            } else {
                // 相同指数的城市，计数+1
                sameValueCount++;
            }
            city.newHouseYearRank = currentRank;
            lastValue = city.newHouseYearIndex;
        }
    });

    // 二手房环比排名
    const sortedByOldMonth = [...cities].sort((a, b) => {
        if (b.oldHouseMonthIndex !== a.oldHouseMonthIndex) {
            return b.oldHouseMonthIndex - a.oldHouseMonthIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });

    currentRank = 1;
    lastValue = null;
    sameValueCount = 1;

    sortedByOldMonth.forEach((city, index) => {
        if (index === 0) {
            city.oldHouseMonthRank = 1;
            lastValue = city.oldHouseMonthIndex;
            sameValueCount = 1;
        } else {
            if (lastValue !== city.oldHouseMonthIndex) {
                // 新的指数值，排名跳过相同值占用的名次
                currentRank += sameValueCount;
                sameValueCount = 1;
            } else {
                // 相同指数的城市，计数+1
                sameValueCount++;
            }
            city.oldHouseMonthRank = currentRank;
            lastValue = city.oldHouseMonthIndex;
        }
    });

    // 二手房同比排名
    const sortedByOldYear = [...cities].sort((a, b) => {
        if (b.oldHouseYearIndex !== a.oldHouseYearIndex) {
            return b.oldHouseYearIndex - a.oldHouseYearIndex;
        }
        return a.name.localeCompare(b.name, 'zh');
    });

    currentRank = 1;
    lastValue = null;
    sameValueCount = 1;

    sortedByOldYear.forEach((city, index) => {
        if (index === 0) {
            city.oldHouseYearRank = 1;
            lastValue = city.oldHouseYearIndex;
            sameValueCount = 1;
        } else {
            if (lastValue !== city.oldHouseYearIndex) {
                // 新的指数值，排名跳过相同值占用的名次
                currentRank += sameValueCount;
                sameValueCount = 1;
            } else {
                // 相同指数的城市，计数+1
                sameValueCount++;
            }
            city.oldHouseYearRank = currentRank;
            lastValue = city.oldHouseYearIndex;
        }
    });
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  70城价格指数通报工具已启动`);
    console.log(`  访问地址: http://localhost:${PORT}`);
    console.log(`========================================`);
});