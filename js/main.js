function loadData() {
    return d3.csv('data/tertiary_enrollment.csv', d => ({
        country: d.country,
        code: d.code,
        region: d.region,
        income: d.income,
        year: +d.year,
        female: +d.female,
        male: +d.male,
        ratio: +d.ratio
    }));
}

function init() {
    loadData()
        .then(rows => {
            drawWhiteHat(rows);
            drawBlackHat(rows);
        })
        .catch(error => console.error('Error loading data:', error));
}

window.addEventListener('load', init);
