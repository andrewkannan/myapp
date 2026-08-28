const start = performance.now();
for (let i = 0; i < 50000; i++) {
    const date = new Date();
    const tzOffset = date.getTimezoneOffset() * 60000;
    const s = new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
}
console.log(performance.now() - start, "ms");
