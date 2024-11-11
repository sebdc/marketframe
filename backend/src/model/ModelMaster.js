class Item {
    constructor( data ) {
        this.thumb = data.thumb;
        this.sub_icon = data.sub_icon;
        this.url_name = data.url_name;
        this.tags = data.tags;
        this.icon = data.icon;
        this.mod_max_rank = data.mod_max_rank;
        this.id = data.id;
        this.icon_format = data.icon_format;
        this.en = data.en;
        this.ru = data.ru;
        this.ko = data.ko;
        this.fr = data.fr;
        this.sv = data.sv;
        this.de = data.de;
        this.zh_hant = data['zh-hant'];
        this.zh_hans = data['zh-hans'];
        this.pt = data.pt;
        this.es = data.es;
        this.pl = data.pl;
        this.cs = data.cs;
        this.uk = data.uk;
    }
}

module.exports = Item;  

const Item = require('./Item');

class ItemOrder {
    constructor(data) {
        // Basic order information
        this.id = data.id;
        this.platinum = data.platinum;
        this.quantity = data.quantity;
        this.order_type = data.order_type;
        this.platform = data.platform;
        this.region = data.region;
        this.creation_date = new Date(data.creation_date);
        this.last_update = new Date(data.last_update);
        this.visible = data.visible;
        this.user = {
            ingame_name: data.user.ingame_name,
            status: data.user.status,
            reputation: data.user.reputation
        };
        
        // If mod_rank is provided (for mods)
        if (data.mod_rank !== undefined) {
            this.mod_rank = data.mod_rank;
        }
    }

    // Helper methods
    isOnline() {
        return this.user.status === 'ingame';
    }

    getFormattedPrice() {
        return `${this.platinum} platinum`;
    }
}

module.exports = ItemOrder;
  
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