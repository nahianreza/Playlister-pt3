import jsTPS_Transaction from "../common/jsTPS.js"
/**
 * AddSong_Transaction
 * 
 * 
 * 
 * 
 * @author McKilla Gorilla
 * @author ?
 */
 export default class AddSong_Transaction extends jsTPS_Transaction {
    constructor(initStore) {
        super();
        this.store = initStore;
    }

    doTransaction() {
        this.store.addSong();
        
    }
    
    undoTransaction() {
        let index = this.store.currentList.songs.length - 1;
        this.store.removeSong(index);
    }
}