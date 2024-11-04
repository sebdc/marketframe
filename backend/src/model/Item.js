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