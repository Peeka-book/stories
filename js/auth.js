const auth = {
    check: function() {
        const user = localStorage.getItem('user');
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        return JSON.parse(user);
    },

    loginSuccess: function(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = 'dashboard.html';
    },

    logout: function() {
        localStorage.removeItem('user');
        window.location.href = 'index.html'; // أو login.html
    }
};