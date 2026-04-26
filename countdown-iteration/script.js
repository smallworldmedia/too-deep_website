document.addEventListener('DOMContentLoaded', () => {
    console.log('LCD Iteration environment ready.');

    // Releasing May 1, 2026 (assuming midnight local)
    const releaseDate = new Date('2026-05-01T00:00:00');

    function padZero(num) {
        return num.toString().padStart(2, '0');
    }

    function updateCountdowns() {
        const now = new Date();
        const diff = releaseDate - now;

        let days = 0, hours = 0, mins = 0, secs = 0;
        if (diff > 0) {
            days = Math.floor(diff / (1000 * 60 * 60 * 24));
            hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            mins = Math.floor((diff / 1000 / 60) % 60);
            secs = Math.floor((diff / 1000) % 60);
        }

        const dStr = padZero(days);
        const hStr = padZero(hours);
        const mStr = padZero(mins);
        const sStr = padZero(secs);

        const variants = ['v2a', 'v2b', 'v2c', 'v2d'];

        variants.forEach(v => {
            const elDays = document.getElementById(`${v}-days`);
            const elHours = document.getElementById(`${v}-hours`);
            const elMins = document.getElementById(`${v}-mins`);
            const elSecs = document.getElementById(`${v}-secs`);

            if (elDays) elDays.innerText = dStr;
            if (elHours) elHours.innerText = hStr;
            if (elMins) elMins.innerText = mStr;
            if (elSecs) elSecs.innerText = sStr;
        });
    }

    setInterval(updateCountdowns, 1000);
    updateCountdowns();
});
