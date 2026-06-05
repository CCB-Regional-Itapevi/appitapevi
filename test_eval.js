const fs = require('fs');
const code = fs.readFileSync('js/controllers_v130.js', 'utf8');

// Mock browser objects
global.window = {};
global.angular = {
    module: function() {
        return {
            controller: function(name, fn) {
                if (typeof fn === 'undefined') {
                    console.error('Controller undefined:', name);
                }
                return this;
            },
            config: function() { return this; },
            run: function() { return this; },
            factory: function() { return this; },
            service: function() { return this; },
            directive: function() { return this; },
            filter: function() { return this; }
        };
    }
};

try {
    eval(code);
    console.log("Successfully evaluated.");
} catch (e) {
    console.error("Evaluation error:", e);
}
