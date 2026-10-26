/* static cards: ids 0..n from assets/cards/{1-6}/ */
(function(){
'use strict';
if(typeof DreamCards==='undefined')return;
var CDN='https://cdn.jsdelivr.net/gh/RanceLL/dream-murmurs@main/assets/';
var FOLDERS=['1','2','3','4','5','6'];
var paths=null,loading=null;
function enc(p){return p.split('/').map(function(s){return /^[\x00-\x7F]*$/.test(s)?s:encodeURIComponent(s);}).join('/');}
function load(){
if(paths)return Promise.resolve(paths);
if(loading)return loading;
loading=Promise.all(FOLDERS.map(function(f){
  return fetch(CDN+'cards-list-'+f+'.txt').then(function(r){return r.ok?r.text():'';}).then(function(t){
    return t.split(/\r?\n/).map(function(s){return s.trim();}).filter(Boolean).map(function(n){return 'cards/'+f+'/'+n;});
  }).catch(function(){return [];});
})).then(function(arrs){
  paths=[];arrs.forEach(function(a){paths=paths.concat(a);});
  DreamCards.STATIC_COUNT=paths.length;
  return paths;
});
return loading;
}
load();
function staticUrl(id){if(!paths||!paths.length)return null;var n=paths.length,sid=((id%n)+n)%n;return CDN+enc(paths[sid]);}
var op=DreamCards.plan.bind(DreamCards),ou=DreamCards.url.bind(DreamCards),on=DreamCards.urlNow.bind(DreamCards);
DreamCards.plan=function(id){id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;var n=(paths&&paths.length)?paths.length:300,sid=id%n,name='梦境 '+String(sid).padStart(3,'0');return{id:id,name:name,desc:'一幅天空之城风格的机械幻想画面。',tags:['机械','浮空','天空之城'],tpl:'static',theme:name,motifs:[]};};
DreamCards.url=function(id,w){if(id==='back')return ou(id,w);id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;return load().then(function(){return staticUrl(id)||ou(id,w);});};
DreamCards.urlNow=function(id,w){if(id==='back')return on(id,w);id=((id%DreamCards.BOX)+DreamCards.BOX)%DreamCards.BOX;return staticUrl(id);};
DreamCards.STATIC_COUNT=300;DreamCards.staticReady=load;
})();
