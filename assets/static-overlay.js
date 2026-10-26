/* static cards 300 - placeholder load from cards-list */
(function(){
'use strict';
if(typeof DreamCards==='undefined')return;
var CDN='https://cdn.jsdelivr.net/gh/RanceLL/dream-murmurs@main/assets/';
var LIST_URL=CDN+'cards-list.txt';
var paths=null,loading=null;
function enc(p){return p.split('/').map(function(s){return /^[\x00-\x7F]*$/.test(s)?s:encodeURIComponent(s);}).join('/');}
function load(){if(paths)return Promise.resolve(paths);if(loading)return loading;loading=fetch(LIST_URL).then(function(r){return r.text();}).then(function(t){paths=t.split(/\r?\n/).map(function(s){return s.trim();}).filter(Boolean);return paths;}).catch(function(e){console.warn(e);paths=[];return paths;});return loading;}
load();
function staticUrl(id){if(!paths||!paths.length)return null;var n=paths.length,sid=((id%n)+n)%n;return CDN+enc(paths[sid]);}
var op=DreamCards.plan.bind(DreamCards),ou=DreamCards.url.bind(DreamCards),on=DreamCards.urlNow.bind(DreamCards);
DreamCards.plan=function(id){id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;var sid=id%(paths&&paths.length?paths.length:300),name='梦境 '+String(sid).padStart(3,'0');return{id:id,name:name,desc:'一幅天空之城风格的机械幻想画面。',tags:['机械','浮空','天空之城'],tpl:'static',theme:name,motifs:[]};};
DreamCards.url=function(id,w){if(id==='back')return ou(id,w);id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;return load().then(function(){return staticUrl(id)||ou(id,w);});};
DreamCards.urlNow=function(id,w){if(id==='back')return on(id,w);id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;return staticUrl(id);};
DreamCards.STATIC_COUNT=300;DreamCards.staticReady=load;
})();
