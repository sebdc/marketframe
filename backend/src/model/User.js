class User {
    constructor( userData ) {
        this.id = userData.id || '';
        this.ingame_name = userData.ingame_name || '';
        this.hasMail = userData.has_mail || false;
        this.banned = userData.banned || false;
        this.anonymous = userData.anonymous || false;
        this.unreadMessages = userData.unread_messages || 0;
        this.avatar = userData.avatar || '';
        this.verification = userData.verification || false;
        this.checkCode = userData.check_code || '';
        this.reputation = userData.reputation || 0;
        this.platform = userData.platform || 'pc';
        this.background = userData.background || null;
        this.writtenReviews = userData.written_reviews || 0;
        this.linkedAccounts = userData.linked_accounts || {};
        this.role = userData.role || 'user';
        this.locale = userData.locale || 'en';
        this.region = userData.region || 'en';
    }

    // - Helper methods to check user state
    get username() {
        return this.ingame_name;
    }

    get isVerified() {
        return this.verification;
    }

    get isBanned() {
        return this.banned;
    }

    get hasUnreadMessages() {
        return this.unreadMessages > 0;
    }

    // - Static factory method to create from API response
    static fromApiResponse( response ) {
        if( !response?.payload?.user ) {
            throw new Error('Invalid API response format');
        }
        return new User(response.payload.user);
    }
}

module.exports = User;