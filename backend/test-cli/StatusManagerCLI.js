const readline = require('readline');
const WarframeMarket = require('../src/api/WarframeMarket');
const Credentials = require('../src/utils/Credentials');
const { email, password } = Credentials.credentials;

class StatusManagerCLI {
    constructor() {
        this.wfm = new WarframeMarket();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.statuses = {
            '1': 'online',
            '2': 'invisible',
            '3': 'in_game'
        };
    }

    async initialize() {
        try {
            console.log('Logging in...');
            await this.wfm.signIn(email, password);
            const user = this.wfm.auth.getCurrentUser();
            console.log(`Successfully logged in as ${user.ingame_name}!`);
        } catch( error ) {
            console.error('Failed to initialize:', error.message);
            process.exit(1);
        }
    }

    displayStatusMenu() {
        console.log('\nCurrent Status Options:');
        console.log('1. Online');
        console.log('2. Invisible');
        console.log('3. In Game');
        console.log('4. Exit');
    }

    async promptForStatus() {
        return new Promise((resolve) => {
            this.rl.question('\nSelect your status (1-4): ', (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async updateStatus( statusKey ) {
        const status = this.statuses[statusKey];
        if( !status ) return false;

        try {
            await this.wfm.auth.setStatus(status);
            console.log(`\nStatus successfully updated to: ${status.toUpperCase()}`);
            return true;
        } catch( error ) {
            console.error(`Failed to update status: ${error.message}`);
            return false;
        }
    }

    async start() {
        await this.initialize();

        while( true ) {
            this.displayStatusMenu();
            const selection = await this.promptForStatus();

            if (selection === '4') {
                console.log('Exiting...');
                break;
            }

            if (!this.statuses[selection]) {
                console.log('Invalid selection. Please try again.');
                continue;
            }

            await this.updateStatus(selection);
        }

        this.rl.close();
    }
}

async function main() {
    const statusManager = new StatusManagerCLI();
    await statusManager.start();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});