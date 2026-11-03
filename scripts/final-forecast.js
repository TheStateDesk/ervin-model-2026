/* Immutable forecast data boundary. Final forecast remains unchanged while
 * polling feeds and election-night reported votes continue to update. */
(function(root){'use strict';
const url=new URL('../final/forecast-final.json',document.currentScript?.src||location.href);
const statusUrl=new URL('../final/status.json',url);
let cache=null,statusCache=null;
const load=()=>cache||(cache=fetch(url,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null));
const status=()=>statusCache||(statusCache=fetch(statusUrl,{cache:'no-store'}).then(r=>r.ok?r.json():{phase:'auto'}).catch(()=>({phase:'auto'})));
const get=async(path,loadOriginal)=>{const snapshot=await load();return Object.hasOwn(snapshot?.data||{},path)?snapshot.data[path]:loadOriginal(path)};
const stamp=async()=>{const snap=await load();return snap?.lockedAt||null};
root.ERVIN_FINAL={get,load,status,stamp};
})(typeof window!=='undefined'?window:globalThis);