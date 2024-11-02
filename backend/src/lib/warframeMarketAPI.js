const API_BASE_URL = 'https://api.warframe.market/v1';

class WarframeMarketAPI {
  constructor() {
    this.authToken = null;
  }

  async getJwtToken() {
    const response = await fetch(API_BASE_URL);
    const cookies = response.headers.get('set-cookie');
    return cookies.split(';')[0].split('=')[1];
  }

  async signIn(email, password, deviceId = null, authType = 'header') {
    const jwt = await this.getJwtToken();
    const loginUrl = `${API_BASE_URL}/auth/signin`;

    const loginData = {
      email,
      password,
      device_id: deviceId,
      auth_type: authType,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: jwt,
    };

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginData),
      });

      console.log(`Login response status code: ${response.status}`);

      if (response.ok) {
        this.authToken = response.headers.get('authorization');
        if (!this.authToken) {
          throw new Error('Authorization token not found in response headers');
        }
        console.log('Login successful.');
      } else {
        throw new Error(`Login failed. Status code: ${response.status}`);
      }

      const data = await response.json();
      console.log(data.payload.user);
    } catch (error) {
      console.error(`An error occurred during login: ${error.message}`);
      throw error;
    }
  }

  // Implement other methods (getProfileOrders, getMyOrders) here
}

module.exports = WarframeMarketAPI;