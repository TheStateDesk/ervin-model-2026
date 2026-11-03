/* Shared AP-style editorial timestamp formatter, New York time zone.
 * Never substitutes an inferred source time for an absent published time.
 */
(function(root){'use strict';
const monthAbbrev={Jan:'Jan.',Feb:'Feb.',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'Aug.',Sep:'Sept.',Oct:'Oct.',Nov:'Nov.',Dec:'Dec.'};
function parts(value){
 const t=new Date(value);if(!Number.isFinite(t.getTime()))return null;
 const obj={};for(const p of new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(t)){if(p.type!=='literal')obj[p.type]=p.value}
 return obj;
}
const date=value=>{const p=parts(value);return p?monthAbbrev[p.month]+' '+p.day+', '+p.year:null};
const timestamp=value=>{const p=parts(value);if(!p)return null;return monthAbbrev[p.month]+' '+p.day+', '+p.hour+':'+p.minute+' '+(p.dayPeriod==='AM'?'a.m.':'p.m.')+' ET'};
root.ERVIN_AP_DATE=Object.freeze({date,timestamp});
})(typeof window!=='undefined'?window:globalThis);
