const WH = {
    margin: {top: 30, right: 180, bottom: 50, left: 60},
    width: 760,
    height: 420
};

const incomeOrder = ['Low income', 'Lower middle income', 'Upper middle income', 'High income'];
const incomeColor = d3.scaleOrdinal()
    .domain(incomeOrder)
    .range(['#b2182b', '#ef8a62', '#67a9cf', '#2166ac']);

function drawWhiteHat(rows) {
    drawTrend(rows);
    drawLatest(rows);
}

function drawTrend(rows) {
    const innerW = WH.width - WH.margin.left - WH.margin.right;
    const innerH = WH.height - WH.margin.top - WH.margin.bottom;

    const svg = d3.select('#wh-trend')
        .append('svg')
        .attr('width', WH.width)
        .attr('height', WH.height)
        .append('g')
        .attr('transform', `translate(${WH.margin.left},${WH.margin.top})`);

    const byIncomeYear = d3.rollup(
        rows,
        v => ({
            median: d3.median(v, d => d.ratio),
            q1: d3.quantile(v.map(d => d.ratio).sort(d3.ascending), 0.25),
            q3: d3.quantile(v.map(d => d.ratio).sort(d3.ascending), 0.75),
            n: v.length
        }),
        d => d.income,
        d => d.year
    );

    const series = incomeOrder.map(income => {
        const years = byIncomeYear.get(income) || new Map();
        const points = Array.from(years, ([year, stats]) => ({year, ...stats}))
            .filter(d => d.n >= 5)
            .sort((a, b) => d3.ascending(a.year, b.year));
        return {income, points};
    }).filter(s => s.points.length > 1);

    const x = d3.scaleLinear()
        .domain(d3.extent(rows, d => d.year))
        .range([0, innerW]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(series, s => d3.max(s.points, p => p.q3)) * 1.05])
        .range([innerH, 0])
        .nice();

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8).tickSizeOuter(0));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

    svg.append('line')
        .attr('class', 'parity')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(1))
        .attr('y2', y(1));

    svg.append('text')
        .attr('class', 'parity-label')
        .attr('x', 4)
        .attr('y', y(1) - 6)
        .text('1.0 = equal numbers of women and men enrolled');

    const area = d3.area()
        .x(d => x(d.year))
        .y0(d => y(d.q1))
        .y1(d => y(d.q3));

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.median));

    svg.selectAll('path.band')
        .data(series)
        .join('path')
        .attr('class', 'band')
        .attr('d', d => area(d.points))
        .style('fill', d => incomeColor(d.income));

    svg.selectAll('path.median-line')
        .data(series)
        .join('path')
        .attr('class', 'median-line')
        .attr('d', d => line(d.points))
        .style('stroke', d => incomeColor(d.income));

    svg.selectAll('text.series-label')
        .data(series)
        .join('text')
        .attr('class', 'series-label')
        .attr('x', d => x(d.points[d.points.length - 1].year) + 8)
        .attr('y', d => y(d.points[d.points.length - 1].median) + 4)
        .style('fill', d => incomeColor(d.income))
        .text(d => d.income);

    svg.append('text')
        .attr('class', 'axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -44)
        .attr('text-anchor', 'middle')
        .text('Female-to-male enrollment ratio');

    const coverage = Array.from(
        d3.rollup(rows, v => v.length, d => d.year),
        ([year, n]) => ({year, n})
    ).sort((a, b) => d3.ascending(a.year, b.year));

    const covH = 46;
    const cov = d3.select('#wh-coverage')
        .append('svg')
        .attr('width', WH.width)
        .attr('height', covH + 48)
        .append('g')
        .attr('transform', `translate(${WH.margin.left},22)`);

    const yCov = d3.scaleLinear()
        .domain([0, d3.max(coverage, d => d.n)])
        .range([covH, 0]);

    cov.selectAll('rect')
        .data(coverage)
        .join('rect')
        .attr('x', d => x(d.year) - 2)
        .attr('y', d => yCov(d.n))
        .attr('width', 4)
        .attr('height', d => covH - yCov(d.n))
        .style('fill', '#9e9e9e');

    cov.append('g')
        .attr('class', 'axis small')
        .attr('transform', `translate(0,${covH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(8).tickSizeOuter(0));

    cov.append('text')
        .attr('class', 'cov-title')
        .attr('x', 0)
        .attr('y', -2)
        .text(`Countries reporting each year (${d3.min(coverage, d => d.n)}–${d3.max(coverage, d => d.n)})`);
}

function drawLatest(rows) {
    const year = 2017;
    const latest = rows.filter(d => d.year === year);
    const cap = 2.5;
    const outliers = latest.filter(d => d.ratio > cap).sort((a, b) => d3.descending(a.ratio, b.ratio));

    const left = 170;
    const innerW = WH.width - left - 40;
    const rowH = 54;
    const svg = d3.select('#wh-latest')
        .append('svg')
        .attr('width', WH.width)
        .attr('height', rowH * incomeOrder.length + 86)
        .append('g')
        .attr('transform', `translate(${left},28)`);

    const x = d3.scaleLinear()
        .domain([0, cap])
        .range([0, innerW]);

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${rowH * incomeOrder.length})`)
        .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

    svg.append('line')
        .attr('class', 'parity')
        .attr('x1', x(1))
        .attr('x2', x(1))
        .attr('y1', -8)
        .attr('y2', rowH * incomeOrder.length);

    incomeOrder.forEach((income, i) => {
        const group = latest.filter(d => d.income === income);
        if (group.length === 0) {
            return;
        }
        const cy = i * rowH + rowH / 2;
        const below = group.filter(d => d.ratio < 1).length;

        svg.append('text')
            .attr('class', 'row-label')
            .attr('x', -8)
            .attr('y', cy - 4)
            .attr('text-anchor', 'end')
            .text(income);

        svg.append('text')
            .attr('class', 'row-sub')
            .attr('x', -8)
            .attr('y', cy + 11)
            .attr('text-anchor', 'end')
            .text(`${group.length} countries · ${below} below parity`);

        svg.selectAll(`circle.dot-${i}`)
            .data(group)
            .join('circle')
            .attr('class', d => `dot dot-${i}${d.ratio > cap ? ' is-capped' : ''}`)
            .attr('cx', d => x(Math.min(d.ratio, cap)))
            .attr('cy', () => cy + (Math.random() - 0.5) * 18)
            .attr('r', 4)
            .style('fill', incomeColor(income))
            .on('mouseover', (event, d) => showTip(event,
                `<strong>${d.country}</strong><br/>${d.income}<br/>
                 women ${d.female.toFixed(1)}% · men ${d.male.toFixed(1)}%<br/>
                 ratio ${d.ratio.toFixed(2)}`))
            .on('mousemove', moveTip)
            .on('mouseout', hideTip);

        svg.append('line')
            .attr('class', 'median-tick')
            .attr('x1', x(d3.median(group, d => d.ratio)))
            .attr('x2', x(d3.median(group, d => d.ratio)))
            .attr('y1', cy - 16)
            .attr('y2', cy + 16);
    });

    svg.append('text')
        .attr('class', 'axis-title')
        .attr('x', innerW / 2)
        .attr('y', rowH * incomeOrder.length + 40)
        .attr('text-anchor', 'middle')
        .text(`Female-to-male tertiary enrollment ratio, ${year}`);

    svg.append('text')
        .attr('class', 'axis-note')
        .attr('x', innerW / 2)
        .attr('y', rowH * incomeOrder.length + 56)
        .attr('text-anchor', 'middle')
        .text('one dot = one country \u00b7 vertical tick = group median \u00b7 outlined dots are plotted at the axis cap');

    if (outliers.length > 0) {
        d3.select('#wh-outliers')
            .text(`Axis capped at ${cap.toFixed(1)}. ${outliers.length} countries fall beyond it and are drawn at the cap: `
                + outliers.map(d => `${d.country} ${d.ratio.toFixed(1)} (women ${d.female.toFixed(0)}%, men ${d.male.toFixed(0)}%)`).join(', ')
                + '. Both are cases where male enrollment is unusually low rather than female enrollment being unusually high.');
    }
}

function showTip(event, html) {
    d3.select('#tooltip').style('display', 'block').html(html);
    moveTip(event);
}

function moveTip(event) {
    d3.select('#tooltip')
        .style('left', (event.pageX + 16) + 'px')
        .style('top', (event.pageY - 24) + 'px');
}

function hideTip() {
    d3.select('#tooltip').style('display', 'none');
}
