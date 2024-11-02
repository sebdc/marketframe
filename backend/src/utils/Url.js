class Url {
    static API_BASE_URL = 'https://api.warframe.market/v1';

    // - Define endpoint paths as static properties
    static LOGIN = '/auth/signin';
    static PROFILE = '/profile';
    static MY_ORDERS = '/my/orders';

    /**
     *  Static methods to return the full URL for each common endpoint
     *  Usage Example: urlBuilder.loginUrl();
     */
    static baseUrl() {
        return `${this.API_BASE_URL}`;
    }

    static loginUrl() {
        return `${this.API_BASE_URL}${this.LOGIN}`;
    }

    static profileUrl() {
        return `${this.API_BASE_URL}${this.PROFILE}`;
    }

    static myOrdersUrl() {
        return `${this.API_BASE_URL}${this.MY_ORDERS}`;
    }

    // General method to build URL for any other endpoint
    static buildUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }

    /**
     *  Method to build the full URL by combining the base and the endpoint
     * 
     *  Usage Example: urlBuilder = buildUrl(UrlBuilder.LOGIN);
     */
    static buildUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }
}

module.exports = Url;