const Item = require('./Item');

class ItemOrder {
    constructor( data ) {
        this.item = new Item(data.item);
        this.name = this.item.en.item_name;
        this.platinum = data.platinum;
        this.creation_date = new Date(data.creation_date);
        this.region = data.region;
        this.mod_rank = data.mod_rank;
        this.order_type = data.order_type;
        this.platform = data.platform;
        this.quantity = data.quantity;
        this.id = data.id;
        this.visible = data.visible;
        this.last_update = new Date(data.last_update);
    }
}
  
module.exports = ItemOrder;  