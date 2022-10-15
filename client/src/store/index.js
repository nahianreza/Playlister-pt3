import { createContext, useState } from 'react'
import jsTPS from '../common/jsTPS'
import api from '../api'
import AddSong_Transaction from '../Transactions/AddSong_Transaction'
import RemoveSong_Transaction from '../Transactions/RemoveSong_Transaction'
import MoveSong_Transaction from '../Transactions/MoveSong_Transaction'
import EditSong_Transaction from '../Transactions/EditSong_Transaction'
export const GlobalStoreContext = createContext({});
/*
    This is our global data store. Note that it uses the Flux design pattern,
    which makes use of things like actions and reducers. 
    
    @author McKilla Gorilla
*/

// THESE ARE ALL THE TYPES OF UPDATES TO OUR GLOBAL
// DATA STORE STATE THAT CAN BE PROCESSED
export const GlobalStoreActionType = {
    CHANGE_LIST_NAME: "CHANGE_LIST_NAME",
    CLOSE_CURRENT_LIST: "CLOSE_CURRENT_LIST",
    CREATE_NEW_LIST: "CREATE_NEW_LIST",
    LOAD_ID_NAME_PAIRS: "LOAD_ID_NAME_PAIRS",
    SET_CURRENT_LIST: "SET_CURRENT_LIST",
    SET_LIST_NAME_EDIT_ACTIVE: "SET_LIST_NAME_EDIT_ACTIVE",
    MARK_SONG_FOR_REMOVAL: "MARK_SONG_FOR_REMOVAL",
    MARK_SONG_FOR_EDIT: "MARK_SONG_FOR_EDIT"
}

// WE'LL NEED THIS TO PROCESS TRANSACTIONS
const tps = new jsTPS();

// WITH THIS WE'RE MAKING OUR GLOBAL DATA STORE
// AVAILABLE TO THE REST OF THE APPLICATION
export const useGlobalStore = () => {
    // THESE ARE ALL THE THINGS OUR DATA STORE WILL MANAGE
    const [store, setStore] = useState({
        idNamePairs: [],
        currentList: null,
        newListCounter: 0,
        listNameActive: false,
    });

    // HERE'S THE DATA STORE'S REDUCER, IT MUST
    // HANDLE EVERY TYPE OF STATE CHANGE
    const storeReducer = (action) => {
        const { type, payload } = action;
        switch (type) {
            // LIST UPDATE OF ITS NAME
            case GlobalStoreActionType.CHANGE_LIST_NAME: {
                return setStore({
                    idNamePairs: payload.idNamePairs,
                    currentList: payload.playlist,
                    newListCounter: store.newListCounter,
                    listNameActive: false
                });
            }
            // STOP EDITING THE CURRENT LIST
            case GlobalStoreActionType.CLOSE_CURRENT_LIST: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: null,
                    newListCounter: store.newListCounter,
                    listNameActive: false
                })
            }
            // CREATE A NEW LIST
            case GlobalStoreActionType.CREATE_NEW_LIST: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: payload,
                    newListCounter: store.newListCounter + 1,
                    listNameActive: false
                })
            }
            // GET ALL THE LISTS SO WE CAN PRESENT THEM
            case GlobalStoreActionType.LOAD_ID_NAME_PAIRS: {
                return setStore({
                    idNamePairs: payload,
                    currentList: null,
                    newListCounter: store.newListCounter,
                    listNameActive: false
                });
            }
            // PREPARE TO DELETE A LIST
            case GlobalStoreActionType.MARK_LIST_FOR_DELETION: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: null,
                    newListCounter: store.newListCounter,
                    listNameActive: false,
                    listMarkedForDeletion: payload
                });
            }
            case GlobalStoreActionType.MARK_SONG_FOR_REMOVAL: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: store.currentList,
                    newListCounter: store.newListCounter,
                    listNameActive: false,
                    songMarkedForRemoval: payload

                });
            }
            case GlobalStoreActionType.MARK_SONG_FOR_EDIT: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: store.currentList,
                    newListCounter: store.newListCounter,
                    listNameActive: false,
                    songMarkedForEdit: payload
                });
            }
            // UPDATE A LIST
            case GlobalStoreActionType.SET_CURRENT_LIST: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: payload,
                    newListCounter: store.newListCounter,
                    listNameActive: false
                });
            }
            // START EDITING A LIST NAME
            case GlobalStoreActionType.SET_LIST_NAME_EDIT_ACTIVE: {
                return setStore({
                    idNamePairs: store.idNamePairs,
                    currentList: payload,
                    newListCounter: store.newListCounter,
                    listNameActive: true
                });
            }
            default:
                return store;
        }
    }
    store.createNewList = () => {
        async function asyncCreateNewList(){
            let playlist = {name: 'Untitled', songs: []};
            let response = await api.createNewList(playlist);
            if (response.data.success) {
                playlist = response.data.playlist;
                storeReducer({type: GlobalStoreActionType.CREATE_NEW_LIST, payload: playlist});
                store.history.push("/playlist/" + playlist._id);
            }
        }
        asyncCreateNewList();
    }
    // THESE ARE THE FUNCTIONS THAT WILL UPDATE OUR STORE AND
    // DRIVE THE STATE OF THE APPLICATION. WE'LL CALL THESE IN 
    // RESPONSE TO EVENTS INSIDE OUR COMPONENTS.

    // THIS FUNCTION PROCESSES CHANGING A LIST NAME
    store.changeListName = function (id, newName) {
        // GET THE LIST
        async function asyncChangeListName(id) {
            let response = await api.getPlaylistById(id);
            if (response.data.success) {
                let playlist = response.data.playlist;
                playlist.name = newName;
                async function updateList(playlist) {
                    response = await api.updateListById(playlist._id, playlist);
                    if (response.data.success) {
                        async function getListPairs(playlist) {
                            response = await api.getPlaylistPairs();
                            if (response.data.success) {
                                let pairsArray = response.data.idNamePairs;
                                storeReducer({
                                    type: GlobalStoreActionType.CHANGE_LIST_NAME,
                                    payload: {
                                        idNamePairs: pairsArray,
                                        playlist: playlist
                                    }
                                });
                            }
                        }
                        getListPairs(playlist);
                    }
                }
                updateList(playlist);
            }
        }
        asyncChangeListName(id);
    }
    store.setIsListNameEditActive = () => {
        storeReducer({type: GlobalStoreActionType.SET_LIST_NAME_EDIT_ACTIVE, payload: null});
    }
    // THIS FUNCTION PROCESSES CLOSING THE CURRENTLY LOADED LIST
    store.closeCurrentList = function () {
        tps.clearAllTransactions();
        storeReducer({
            type: GlobalStoreActionType.CLOSE_CURRENT_LIST,
            payload: {}
        });
    }
    store.addSongTransaction= () =>{
        let transaction = new AddSong_Transaction(store);
        tps.addTransaction(transaction);
    }
    store.addSong = () =>{
        async function asyncAddSong(){
            let song = {title: 'Untitled', artist: 'Unknown' , youTubeId: "dQw4w9WgXcQ" };
            let newList = store.currentList;
            newList.songs.push(song);
            let response = await api.updateListById(store.currentList._id, newList);
            if(response.data.success){
                store.setCurrentList(response.data.id);
            }
        }
        asyncAddSong();
    }
    // THIS FUNCTION LOADS ALL THE ID, NAME PAIRS SO WE CAN LIST ALL THE LISTS
    store.loadIdNamePairs = function () {
        async function asyncLoadIdNamePairs() {
            const response = await api.getPlaylistPairs();
            if (response.data.success) {
                let pairsArray = response.data.idNamePairs;
                storeReducer({
                    type: GlobalStoreActionType.LOAD_ID_NAME_PAIRS,
                    payload: pairsArray
                });
            }
            else {
                console.log("API FAILED TO GET THE LIST PAIRS");
            }
        }
        asyncLoadIdNamePairs();
    }

    store.setCurrentList = function (id) {
        async function asyncSetCurrentList(id) {
            let response = await api.getPlaylistById(id);
            if (response.data.success) {
                let playlist = response.data.playlist;

                if (response.data.success) {
                    storeReducer({
                        type: GlobalStoreActionType.SET_CURRENT_LIST,
                        payload: playlist
                    });
                    store.history.push("/playlist/" + playlist._id);
                }
            }
        }
        asyncSetCurrentList(id);
    }
    store.getPlaylistSize = function() {
        return store.currentList.songs.length;
    }
    store.undo = function () {
        tps.undoTransaction();
    }
    store.redo = function () {
        tps.doTransaction();
    }

    // THIS FUNCTION ENABLES THE PROCESS OF EDITING A LIST NAME
    store.setlistNameActive = function () {
        storeReducer({
            type: GlobalStoreActionType.SET_LIST_NAME_EDIT_ACTIVE,
            payload: null
        });
    }
    store.showDeleteListModal = (idNamePair) => {
        let modal = document.getElementById('delete-modal');
        storeReducer({type: GlobalStoreActionType.MARK_LIST_FOR_DELETION, payload: idNamePair})
        modal.classList.add('is-visible');
    }

    store.hideDeleteListModal = () => {
        let modal = document.getElementById('delete-modal');
        modal.classList.remove('is-visible');
    }
    store.deleteMarkedList = () => {
        async function asyncDeleteMarkedList() {
            let response = await api.deleteListById(store.listMarkedForDeletion._id);
            if (response.data.success){
                store.loadIdNamePairs();
            }
        }
        asyncDeleteMarkedList();
    }
    store.updateCurrentList = function() {
        async function asyncUpdateCurrentList() {
            const response = await api.updateListById(store.currentList._id, store.currentList);
            if (response.data.success) {
                storeReducer({
                    type: GlobalStoreActionType.SET_CURRENT_LIST,
                    payload: store.currentList
                });
            }
        }
        asyncUpdateCurrentList();
    }
    store.removeMarkedSong = () => {
        store.addRemoveSongTransaction(store.songMarkedForRemoval, store.currentList.songs[store.songMarkedForRemoval]);
    }
    store.editMarkedSong = (newSong) => {
        let index = store.songMarkedForEdit;
        let oldSong = store.currentList.songs[index];
        let t = new EditSong_Transaction(store, index, newSong, oldSong);
        tps.addTransaction(t);
    }

    store.addRemoveSongTransaction = (index, song) => {
        let transaction = new RemoveSong_Transaction(store, index, song);
        tps.addTransaction(transaction);
    }
    store.removeSong = (index) => {
        async function asyncRemoveSong() {
            store.currentList.songs.splice(index, 1);
            store.updateCurrentList();
        }
        asyncRemoveSong();
    }
    store.showRemoveSongModal = (index) => {
        let modal = document.getElementById('remove-modal');
        storeReducer({type: GlobalStoreActionType.MARK_SONG_FOR_REMOVAL, payload: index})
        modal.classList.add('is-visible');
    }

    store.hideRemoveSongModal = () => {
        let modal = document.getElementById('remove-modal');
        modal.classList.remove('is-visible');
    }
    store.showEditSongModal = (index) => {
        let modal = document.getElementById('edit-modal');
        storeReducer({type: GlobalStoreActionType.MARK_SONG_FOR_EDIT, payload: index})
        modal.classList.add('is-visible');
    }
    store.hideEditSongModal = () => {
        let modal = document.getElementById('edit-modal');
        modal.classList.remove('is-visible');
    }

    store.insertSong = (index, song) => {
        async function asyncInsertSong() {
            store.currentList.songs.splice(index, 0, song);
            store.updateCurrentList();
        }
        asyncInsertSong();
    }
    store.addMoveItemTransaction = function (start, end) {
        let transaction = new MoveSong_Transaction(store, start, end);
        tps.addTransaction(transaction);
    }

    store.moveItem = function (start, end) {
        if (start < end) {
            let temp = store.currentList.songs[start];
            for (let i = start; i < end; i++) {
                store.currentList.songs[i] = store.currentList.songs[i + 1];
            }
            store.currentList.songs[end] = temp;
        }
        else if (start > end) {
            let temp = store.currentList.songs[start];
            for (let i = start; i > end; i--) {
                store.currentList.songs[i] = store.currentList.songs[i - 1];
            }
            store.currentList.songs[end] = temp;
        }
        store.updateCurrentList();
    }
    store.editSong = (index, song) =>{
        store.currentList.songs[index] = song;
        store.updateCurrentList();
    }

    store.updateCurrentList = function() {
        async function asyncUpdateCurrentList() {
            const response = await api.updateListById(store.currentList._id, store.currentList);
            if (response.data.success) {
                storeReducer({
                    type: GlobalStoreActionType.SET_CURRENT_LIST,
                    payload: store.currentList
                });
            }
        }
        asyncUpdateCurrentList();
    }



    // THIS GIVES OUR STORE AND ITS REDUCER TO ANY COMPONENT THAT NEEDS IT
    return { store, storeReducer };
}