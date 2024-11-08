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
  
module.exports = ItemOrder;  