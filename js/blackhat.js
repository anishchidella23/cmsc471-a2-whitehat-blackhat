const BH = {
    margin: {top: 58, right: 54, bottom: 56, left: 70},
    width: 760,
    height: 450
};

function drawBlackHat(rows) {
    const innerW = BH.width - BH.margin.left - BH.margin.right;
    const innerH = BH.height - BH.margin.top - BH.margin.bottom;

    const selected = rows.filter(d =>
        (d.income === 'High income' || d.income === 'Upper middle income') &&
        d.year >= 1995 && d.year <= 2018);

    const byYear = Array.from(
        d3.rollup(selected, v => d3.mean(v, d => d.female - d.male), d => d.year),
        ([year, gap]) => ({year, gap})
    ).filter(d => d.year % 1 === 0).sort((a, b) => d3.ascending(a.year, b.year));

    const svg = d3.select('#bh-chart')
        .append('svg')
        .attr('width', BH.width)
        .attr('height', BH.height)
        .append('g')
        .attr('transform', `translate(${BH.margin.left},${BH.margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(byYear, d => d.year))
        .range([0, innerW]);

    const y = d3.scalePow()
        .exponent(2.1)
        .domain([d3.min(byYear, d => d.gap) - 0.4, d3.max(byYear, d => d.gap) * 1.1])
        .range([innerH, 0]);

    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'bh-grad')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#b2182b').attr('stop-opacity', 0.85);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#b2182b').attr('stop-opacity', 0.05);

    const area = d3.area()
        .x(d => x(d.year))
        .y0(innerH)
        .y1(d => y(d.gap))
        .curve(d3.curveMonotoneX);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.gap))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(byYear)
        .attr('class', 'bh-area')
        .attr('d', area)
        .style('fill', 'url(#bh-grad)');

    svg.append('path')
        .datum(byYear)
        .attr('class', 'bh-line')
        .attr('d', line);

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(7).tickSizeOuter(0));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format('.0f')(d) + ' pts').tickSizeOuter(0));

    svg.append('text')
        .attr('class', 'axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .text('Male enrollment shortfall');

    const last = byYear[byYear.length - 1];
    const first = byYear[0];

    svg.append('circle')
        .attr('class', 'bh-marker')
        .attr('cx', x(last.year))
        .attr('cy', y(last.gap))
        .attr('r', 5);

    svg.append('text')
        .attr('class', 'bh-annotation')
        .attr('x', x(last.year) - 12)
        .attr('y', y(last.gap) - 20)
        .attr('text-anchor', 'end')
        .text(`${last.gap.toFixed(1)} points behind`);

    svg.append('text')
        .attr('class', 'bh-annotation subtle')
        .attr('x', x(first.year) + 6)
        .attr('y', y(first.gap) - 10)
        .text(`${first.gap.toFixed(1)} in ${first.year}`);

    svg.selectAll('circle.bh-dot')
        .data(byYear)
        .join('circle')
        .attr('class', 'bh-dot')
        .attr('cx', d => x(d.year))
        .attr('cy', d => y(d.gap))
        .attr('r', 9)
        .style('fill', 'transparent')
        .on('mouseover', (event, d) => showTip(event,
            `<strong>${d.year}</strong><br/>men trail by ${d.gap.toFixed(1)} points`))
        .on('mousemove', moveTip)
        .on('mouseout', hideTip);

    drawCounter(rows);
}

function drawCounter(rows) {
    const selected = rows.filter(d =>
        (d.income === 'High income' || d.income === 'Upper middle income') &&
        d.year >= 1995 && d.year <= 2018);

    const seen = new Set();
    const cumulative = [];
    Array.from(d3.group(selected, d => d.year))
        .sort((a, b) => d3.ascending(a[0], b[0]))
        .forEach(([year, group]) => {
            group.forEach(d => {
                if (d.ratio > 1) {
                    seen.add(d.code);
                }
            });
            cumulative.push({year, n: seen.size});
        });

    const w = 360;
    const h = 150;
    const m = {top: 26, right: 16, bottom: 28, left: 36};

    const svg = d3.select('#bh-counter')
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .append('g')
        .attr('transform', `translate(${m.left},${m.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(cumulative, d => d.year))
        .range([0, w - m.left - m.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(cumulative, d => d.n)])
        .range([h - m.top - m.bottom, 0]);

    svg.append('path')
        .datum(cumulative)
        .attr('class', 'bh-line')
        .attr('d', d3.line().x(d => x(d.year)).y(d => y(d.n)));

    svg.append('g')
        .attr('class', 'axis small')
        .attr('transform', `translate(0,${h - m.top - m.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(4).tickSizeOuter(0));

    svg.append('g')
        .attr('class', 'axis small')
        .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));

    svg.append('text')
        .attr('class', 'bh-small-title')
        .attr('x', 0)
        .attr('y', -10)
        .text('Countries where women now outnumber men');
}
