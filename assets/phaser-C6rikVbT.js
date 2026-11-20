const Mt=["FA","REMOVE","BD","UV","POL_TOTAL","FILM","PI","VI","OUT","BLACK","TAPE"],Rt={FA:"FA分析岗（共享）",REMOVE:"TV祛除",BD:"TV BD",UV:"TV UV",POL_TOTAL:"TV POL",FILM:"TV覆膜",PI:"TV PI",VI:"TV VI",OUT:"TV OUT",BLACK:"黑胶（共享来源，当前TV）",TAPE:"贴胶（默认0）"},Bt=rt=>String(rt??"").normalize("NFKC").replace(/[\s\u200b_-]/g,"").toUpperCase();function Pt(rt){if(typeof rt=="string"){if(!/^\d+(?:,\d{3})*$/.test(rt.trim())&&!/^\d+$/.test(rt.trim()))return null;rt=Number(rt.replace(/,/g,""))}return typeof rt=="number"&&Number.isSafeInteger(rt)&&rt>=0?rt:null}function Ft(rt,ct){if(Pt(rt)===null||!Number.isFinite(ct)||ct<0||ct>1)throw Error("POL总量或比例非法");const vt=Math.round(rt*ct);return{peel:vt,pol:rt-vt}}function It(rt){if(!/^\d{4}-\d{2}-\d{2}$/.test(rt.date)||new Date(rt.date).toISOString().slice(0,10)!==rt.date)throw Error("请选择有效日报日期");for(const vt of Mt)if(Pt(rt.counts[vt])===null)throw Error(Rt[vt]+" 必须为非负安全整数");Ft(rt.counts.POL_TOTAL,rt.peelRatio);let ct=0;for(const vt of Object.values(rt.counts))if(ct+=vt,!Number.isSafeInteger(ct))throw Error("初始WIP合计超出安全整数范围");return ct}function Lt(rt){return rt&&rt.__esModule&&Object.prototype.hasOwnProperty.call(rt,"default")?rt.default:rt}var St={exports:{}},Ot=St.exports,Et;function Dt(){return Et||(Et=1,(function(rt,ct){(function(Ct,Tt){rt.exports=Tt()})(Ot,()=>(()=>{var vt={50792:(p=>{var S=Object.prototype.hasOwnProperty,t="~";function d(){}Object.create&&(d.prototype=Object.create(null),new d().__proto__||(t=!1));function c(e,s,h){this.fn=e,this.context=s,this.once=h||!1}function a(e,s,h,i,o){if(typeof h!="function")throw new TypeError("The listener must be a function");var u=new c(h,i||e,o),l=t?t+s:s;return e._events[l]?e._events[l].fn?e._events[l]=[e._events[l],u]:e._events[l].push(u):(e._events[l]=u,e._eventsCount++),e}function r(e,s){--e._eventsCount===0?e._events=new d:delete e._events[s]}function n(){this._events=new d,this._eventsCount=0}n.prototype.eventNames=function(){var s=[],h,i;if(this._eventsCount===0)return s;for(i in h=this._events)S.call(h,i)&&s.push(t?i.slice(1):i);return Object.getOwnPropertySymbols?s.concat(Object.getOwnPropertySymbols(h)):s},n.prototype.listeners=function(s){var h=t?t+s:s,i=this._events[h];if(!i)return[];if(i.fn)return[i.fn];for(var o=0,u=i.length,l=new Array(u);o<u;o++)l[o]=i[o].fn;return l},n.prototype.listenerCount=function(s){var h=t?t+s:s,i=this._events[h];return i?i.fn?1:i.length:0},n.prototype.emit=function(s,h,i,o,u,l){var f=t?t+s:s;if(!this._events[f])return!1;var v=this._events[f],g=arguments.length,x,m;if(v.fn){switch(v.once&&this.removeListener(s,v.fn,void 0,!0),g){case 1:return v.fn.call(v.context),!0;case 2:return v.fn.call(v.context,h),!0;case 3:return v.fn.call(v.context,h,i),!0;case 4:return v.fn.call(v.context,h,i,o),!0;case 5:return v.fn.call(v.context,h,i,o,u),!0;case 6:return v.fn.call(v.context,h,i,o,u,l),!0}for(m=1,x=new Array(g-1);m<g;m++)x[m-1]=arguments[m];v.fn.apply(v.context,x)}else{var y=v.length,T;for(m=0;m<y;m++)switch(v[m].once&&this.removeListener(s,v[m].fn,void 0,!0),g){case 1:v[m].fn.call(v[m].context);break;case 2:v[m].fn.call(v[m].context,h);break;case 3:v[m].fn.call(v[m].context,h,i);break;case 4:v[m].fn.call(v[m].context,h,i,o);break;default:if(!x)for(T=1,x=new Array(g-1);T<g;T++)x[T-1]=arguments[T];v[m].fn.apply(v[m].context,x)}}return!0},n.prototype.on=function(s,h,i){return a(this,s,h,i,!1)},n.prototype.once=function(s,h,i){return a(this,s,h,i,!0)},n.prototype.removeListener=function(s,h,i,o){var u=t?t+s:s;if(!this._events[u])return this;if(!h)return r(this,u),this;var l=this._events[u];if(l.fn)l.fn===h&&(!o||l.once)&&(!i||l.context===i)&&r(this,u);else{for(var f=0,v=[],g=l.length;f<g;f++)(l[f].fn!==h||o&&!l[f].once||i&&l[f].context!==i)&&v.push(l[f]);v.length?this._events[u]=v.length===1?v[0]:v:r(this,u)}return this},n.prototype.removeAllListeners=function(s){var h;return s?(h=t?t+s:s,this._events[h]&&r(this,h)):(this._events=new d,this._eventsCount=0),this},n.prototype.off=n.prototype.removeListener,n.prototype.addListener=n.prototype.on,n.prefixed=t,n.EventEmitter=n,p.exports=n}),11517:((p,S,t)=>{/**
 * @author       samme
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(38829),c=function(a,r,n,e){for(var s=a[0],h=1;h<a.length;h++){var i=a[h];d(i,s,r,n,e),s=i}return a};p.exports=c}),80318:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"angle",r,n,e,s)};p.exports=c}),60757:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c){for(var a=0;a<t.length;a++){var r=t[a];d.call(c,r)}return t};p.exports=S}),69927:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c){c===void 0&&(c=0);for(var a=c;a<t.length;a++){var r=t[a],n=!0;for(var e in d)r[e]!==d[e]&&(n=!1);if(n)return r}return null};p.exports=S}),32265:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c){c===void 0&&(c=0);for(var a=t.length-1;a>=c;a--){var r=t[a],n=!0;for(var e in d)r[e]!==d[e]&&(n=!1);if(n)return r}return null};p.exports=S}),94420:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(11879),c=t(60461),a=t(95540),r=t(29747),n=t(41481),e=new n({sys:{queueDepthSort:r,events:{once:r}}},0,0,1,1).setOrigin(0,0),s=function(h,i){i===void 0&&(i={});var o=i.hasOwnProperty("width"),u=i.hasOwnProperty("height"),l=a(i,"width",-1),f=a(i,"height",-1),v=a(i,"cellWidth",1),g=a(i,"cellHeight",v),x=a(i,"position",c.TOP_LEFT),m=a(i,"x",0),y=a(i,"y",0),T=0,C=0,E=l*v,A=f*g;e.setPosition(m,y),e.setSize(v,g);for(var P=0;P<h.length;P++)if(d(h[P],e,x),o&&l===-1)e.x+=v;else if(u&&f===-1)e.y+=g;else if(u&&!o){if(C+=g,e.y+=g,C===A&&(C=0,T+=v,e.y=y,e.x+=v,T===E))break}else if(T+=v,e.x+=v,T===E&&(T=0,C+=g,e.x=m,e.y+=g,C===A))break;return h};p.exports=s}),41721:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"alpha",r,n,e,s)};p.exports=c}),67285:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"x",r,n,e,s)};p.exports=c}),9074:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"x",r,e,h,i),d(a,"y",n,s,h,i)};p.exports=c}),75222:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"y",r,n,e,s)};p.exports=c}),22983:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a){c===void 0&&(c=0),a===void 0&&(a=6.28);for(var r=c,n=(a-c)/t.length,e=d.x,s=d.y,h=d.radius,i=0;i<t.length;i++)t[i].x=e+h*Math.cos(r),t[i].y=s+h*Math.sin(r),r+=n;return t};p.exports=S}),95253:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a){c===void 0&&(c=0),a===void 0&&(a=6.28);for(var r=c,n=(a-c)/t.length,e=d.width/2,s=d.height/2,h=0;h<t.length;h++)t[h].x=d.x+e*Math.cos(r),t[h].y=d.y+s*Math.sin(r),r+=n;return t};p.exports=S}),88505:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(15258),c=t(26708),a=function(r,n,e){var s;e?s=c(n,e,r.length):s=d(n,r.length);for(var h=0;h<r.length;h++){var i=r[h],o=s[h];i.x=o.x,i.y=o.y}return r};p.exports=a}),41346:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(14649),c=t(86003),a=t(49498),r=function(n,e,s){s===void 0&&(s=0);var h=d(e,!1,n.length);s>0?c(h,s):s<0&&a(h,Math.abs(s));for(var i=0;i<n.length;i++)n[i].x=h[i].x,n[i].y=h[i].y;return n};p.exports=r}),11575:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(84993),c=function(a,r,n){var e=d({x1:r.x1,y1:r.y1,x2:r.x2,y2:r.y2},n),s=d({x1:r.x2,y1:r.y2,x2:r.x3,y2:r.y3},n),h=d({x1:r.x3,y1:r.y3,x2:r.x1,y2:r.y1},n);e.pop(),s.pop(),h.pop(),e=e.concat(s,h);for(var i=e.length/a.length,o=0,u=0;u<a.length;u++){var l=a[u],f=e[Math.floor(o)];l.x=f.x,l.y=f.y,o+=i}return a};p.exports=c}),29953:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c){for(var a=0;a<t.length;a++){var r=t[a];r.anims&&r.anims.play(d,c)}return t};p.exports=S}),66979:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a,r,n){a===void 0&&(a=0),r===void 0&&(r=0),n===void 0&&(n=1);var e,s=0,h=t.length;if(n===1)for(e=r;e<h;e++)t[e][d]+=c+s*a,s++;else for(e=r;e>=0;e--)t[e][d]+=c+s*a,s++;return t};p.exports=S}),43967:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a,r,n){a===void 0&&(a=0),r===void 0&&(r=0),n===void 0&&(n=1);var e,s=0,h=t.length;if(n===1)for(e=r;e<h;e++)t[e][d]=c+s*a,s++;else for(e=r;e>=0;e--)t[e][d]=c+s*a,s++;return t};p.exports=S}),88926:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(28176),c=function(a,r){for(var n=0;n<a.length;n++)d(r,a[n]);return a};p.exports=c}),33286:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(24820),c=function(a,r){for(var n=0;n<a.length;n++)d(r,a[n]);return a};p.exports=c}),96e3:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(65822),c=function(a,r){for(var n=0;n<a.length;n++)d(r,a[n]);return a};p.exports=c}),28789:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(26597),c=function(a,r){for(var n=0;n<a.length;n++)d(r,a[n]);return a};p.exports=c}),97154:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(90260),c=function(a,r){for(var n=0;n<a.length;n++)d(r,a[n]);return a};p.exports=c}),20510:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"rotation",r,n,e,s)};p.exports=c}),91051:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(1163),c=t(20339),a=function(r,n,e){for(var s=n.x,h=n.y,i=0;i<r.length;i++){var o=r[i];d(o,s,h,e,Math.max(1,c(o.x,o.y,s,h)))}return r};p.exports=a}),76332:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(1163),c=function(a,r,n,e){var s=r.x,h=r.y;if(e===0)return a;for(var i=0;i<a.length;i++)d(a[i],s,h,n,e);return a};p.exports=c}),61619:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"scaleX",r,n,e,s)};p.exports=c}),94868:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"scaleX",r,e,h,i),d(a,"scaleY",n,s,h,i)};p.exports=c}),95532:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(66979),c=function(a,r,n,e,s){return d(a,"scaleY",r,n,e,s)};p.exports=c}),8689:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"alpha",r,n,e,s)};p.exports=c}),2645:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e){return d(a,"blendMode",r,0,n,e)};p.exports=c}),32372:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"depth",r,n,e,s)};p.exports=c}),85373:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c){for(var a=0;a<t.length;a++)t[a].setInteractive(d,c);return t};p.exports=S}),81583:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"originX",r,e,h,i),d(a,"originY",n,s,h,i),a.forEach(function(o){o.updateDisplayOrigin()}),a};p.exports=c}),79939:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"rotation",r,n,e,s)};p.exports=c}),2699:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"scaleX",r,e,h,i),d(a,"scaleY",n,s,h,i)};p.exports=c}),98739:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"scaleX",r,n,e,s)};p.exports=c}),98476:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"scaleY",r,n,e,s)};p.exports=c}),6207:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"scrollFactorX",r,e,h,i),d(a,"scrollFactorY",n,s,h,i)};p.exports=c}),6607:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"scrollFactorX",r,n,e,s)};p.exports=c}),72248:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"scrollFactorY",r,n,e,s)};p.exports=c}),14036:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a,r){for(var n=0;n<t.length;n++)t[n].setTint(d,c,a,r);return t};p.exports=S}),50159:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e){return d(a,"visible",r,0,n,e)};p.exports=c}),77597:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"x",r,n,e,s)};p.exports=c}),83194:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s,h,i){return n==null&&(n=r),d(a,"x",r,e,h,i),d(a,"y",n,s,h,i)};p.exports=c}),67678:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(43967),c=function(a,r,n,e,s){return d(a,"y",r,n,e,s)};p.exports=c}),35850:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(26099),c=function(a,r,n,e,s){e===void 0&&(e=0),s===void 0&&(s=new d);var h,i,o=a.length;if(o===1)h=a[0].x,i=a[0].y,a[0].x=r,a[0].y=n;else{var u=1,l=0;e===0&&(l=o-1,u=o-2),h=a[l].x,i=a[l].y,a[l].x=r,a[l].y=n;for(var f=0;f<o;f++)if(!(u>=o||u===-1)){var v=a[u],g=v.x,x=v.y;v.x=h,v.y=i,h=g,i=x,e===0?u--:u++}}return s.x=h,s.y=i,s};p.exports=c}),8628:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(33680),c=function(a){return d(a)};p.exports=c}),21837:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(7602),c=function(a,r,n,e,s){s===void 0&&(s=!1);var h=Math.abs(e-n)/a.length,i;if(s)for(i=0;i<a.length;i++)a[i][r]+=d(i*h,n,e);else for(i=0;i<a.length;i++)a[i][r]=d(i*h,n,e);return a};p.exports=c}),21910:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(54261),c=function(a,r,n,e,s){s===void 0&&(s=!1);var h=Math.abs(e-n)/a.length,i;if(s)for(i=0;i<a.length;i++)a[i][r]+=d(i*h,n,e);else for(i=0;i<a.length;i++)a[i][r]=d(i*h,n,e);return a};p.exports=c}),62054:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t,d,c,a,r){if(r===void 0&&(r=!1),t.length===0)return t;if(t.length===1)return r?t[0][d]+=(a+c)/2:t[0][d]=(a+c)/2,t;var n=Math.abs(a-c)/(t.length-1),e;if(r)for(e=0;e<t.length;e++)t[e][d]+=e*n+c;else for(e=0;e<t.length;e++)t[e][d]=e*n+c;return t};p.exports=S}),79815:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var S=function(t){for(var d=0;d<t.length;d++)t[d].visible=!t[d].visible;return t};p.exports=S}),39665:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @author       samme <samme.npm@gmail.com>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(15994),c=function(a,r,n){n===void 0&&(n=0);for(var e=0;e<a.length;e++){var s=a[e];s.x=d(s.x,r.left-n,r.right+n),s.y=d(s.y,r.top-n,r.bottom+n)}return a};p.exports=c}),61061:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports={AlignTo:t(11517),Angle:t(80318),Call:t(60757),GetFirst:t(69927),GetLast:t(32265),GridAlign:t(94420),IncAlpha:t(41721),IncX:t(67285),IncXY:t(9074),IncY:t(75222),PlaceOnCircle:t(22983),PlaceOnEllipse:t(95253),PlaceOnLine:t(88505),PlaceOnRectangle:t(41346),PlaceOnTriangle:t(11575),PlayAnimation:t(29953),PropertyValueInc:t(66979),PropertyValueSet:t(43967),RandomCircle:t(88926),RandomEllipse:t(33286),RandomLine:t(96e3),RandomRectangle:t(28789),RandomTriangle:t(97154),Rotate:t(20510),RotateAround:t(91051),RotateAroundDistance:t(76332),ScaleX:t(61619),ScaleXY:t(94868),ScaleY:t(95532),SetAlpha:t(8689),SetBlendMode:t(2645),SetDepth:t(32372),SetHitArea:t(85373),SetOrigin:t(81583),SetRotation:t(79939),SetScale:t(2699),SetScaleX:t(98739),SetScaleY:t(98476),SetScrollFactor:t(6207),SetScrollFactorX:t(6607),SetScrollFactorY:t(72248),SetTint:t(14036),SetVisible:t(50159),SetX:t(77597),SetXY:t(83194),SetY:t(67678),ShiftPosition:t(35850),Shuffle:t(8628),SmootherStep:t(21910),SmoothStep:t(21837),Spread:t(62054),ToggleVisible:t(79815),WrapInRectangle:t(39665)}}),42099:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(45319),c=t(83419),a=t(74943),r=t(81957),n=t(41138),e=t(35154),s=t(90126),h=new c({initialize:function(o,u,l){this.manager=o,this.key=u,this.type="frame",this.frames=this.getFrames(o.textureManager,e(l,"frames",[]),e(l,"defaultTextureKey",null),e(l,"sortFrames",!0)),this.frameRate=e(l,"frameRate",null),this.duration=e(l,"duration",null),this.msPerFrame,this.skipMissedFrames=e(l,"skipMissedFrames",!0),this.delay=e(l,"delay",0),this.repeat=e(l,"repeat",0),this.repeatDelay=e(l,"repeatDelay",0),this.yoyo=e(l,"yoyo",!1),this.showBeforeDelay=e(l,"showBeforeDelay",!1),this.showOnStart=e(l,"showOnStart",!1),this.hideOnComplete=e(l,"hideOnComplete",!1),this.randomFrame=e(l,"randomFrame",!1),this.paused=!1,this.calculateDuration(this,this.getTotalFrames(),this.duration,this.frameRate),this.manager.on&&(this.manager.on(a.PAUSE_ALL,this.pause,this),this.manager.on(a.RESUME_ALL,this.resume,this))},getTotalFrames:function(){return this.frames.length},calculateDuration:function(i,o,u,l){u===null&&l===null?(i.frameRate=24,i.duration=24/o*1e3):u&&l===null?(i.duration=u,i.frameRate=o/(u/1e3)):(i.frameRate=l,i.duration=o/l*1e3),i.msPerFrame=1e3/i.frameRate},addFrame:function(i){return this.addFrameAt(this.frames.length,i)},addFrameAt:function(i,o){var u=this.getFrames(this.manager.textureManager,o);if(u.length>0){if(i===0)this.frames=u.concat(this.frames);else if(i===this.frames.length)this.frames=this.frames.concat(u);else{var l=this.frames.slice(0,i),f=this.frames.slice(i);this.frames=l.concat(u,f)}this.updateFrameSequence()}return this},checkFrame:function(i){return i>=0&&i<this.frames.length},getFirstTick:function(i){i.accumulator=0,i.nextTick=i.currentFrame.duration?i.currentFrame.duration:i.msPerFrame},getFrameAt:function(i){return this.frames[i]},getFrames:function(i,o,u,l){l===void 0&&(l=!0);var f=[],v,g,x=1,m,y;if(typeof o=="string"){if(y=o,!i.exists(y))return console.warn('Texture "%s" not found',y),f;var T=i.get(y),C=T.getFrameNames();l&&s(C),o=[],C.forEach(function(L){o.push({key:y,frame:L})})}if(!Array.isArray(o)||o.length===0)return f;for(m=0;m<o.length;m++){var E=o[m],A=e(E,"key",u);if(A){var P=e(E,"frame",0),M=i.getFrame(A,P);if(!M){console.warn('Texture "%s" not found',A);continue}g=new n(A,P,x,M),g.duration=e(E,"duration",0),g.isFirst=!v,v&&(v.nextFrame=g,g.prevFrame=v),f.push(g),v=g,x++}}if(f.length>0){g.isLast=!0,g.nextFrame=f[0],f[0].prevFrame=g;var F=1/(f.length-1);for(m=0;m<f.length;m++)f[m].progress=m*F}return f},getNextTick:function(i){i.accumulator-=i.nextTick,i.nextTick=i.currentFrame.duration?i.currentFrame.duration:i.msPerFrame},getFrameByProgress:function(i){return i=d(i,0,1),r(i,this.frames,"progress")},nextFrame:function(i){var o=i.currentFrame;o.isLast?i.yoyo?this.handleYoyoFrame(i,!1):i.repeatCounter>0?i.inReverse&&i.forward?i.forward=!1:this.repeatAnimation(i):i.complete():this.updateAndGetNextTick(i,o.nextFrame)},handleYoyoFrame:function(i,o){if(o||(o=!1),i.inReverse===!o&&i.repeatCounter>0){(i.repeatDelay===0||i.pendingRepeat)&&(i.forward=o),this.repeatAnimation(i);return}if(i.inReverse!==o&&i.repeatCounter===0){i.complete();return}i.forward=o;var u=o?i.currentFrame.nextFrame:i.currentFrame.prevFrame;this.updateAndGetNextTick(i,u)},getLastFrame:function(){return this.frames[this.frames.length-1]},previousFrame:function(i){var o=i.currentFrame;o.isFirst?i.yoyo?this.handleYoyoFrame(i,!0):i.repeatCounter>0?i.inReverse&&!i.forward?this.repeatAnimation(i):(i.forward=!0,this.repeatAnimation(i)):i.complete():this.updateAndGetNextTick(i,o.prevFrame)},updateAndGetNextTick:function(i,o){i.setCurrentFrame(o),this.getNextTick(i)},removeFrame:function(i){var o=this.frames.indexOf(i);return o!==-1&&this.removeFrameAt(o),this},removeFrameAt:function(i){return this.frames.splice(i,1),this.updateFrameSequence(),this},repeatAnimation:function(i){if(i._pendingStop===2){if(i._pendingStopValue===0)return i.stop();i._pendingStopValue--}i.repeatDelay>0&&!i.pendingRepeat?(i.pendingRepeat=!0,i.accumulator-=i.nextTick,i.nextTick+=i.repeatDelay):(i.repeatCounter--,i.forward?i.setCurrentFrame(i.currentFrame.nextFrame):i.setCurrentFrame(i.currentFrame.prevFrame),i.isPlaying&&(this.getNextTick(i),i.handleRepeat()))},toJSON:function(){var i={key:this.key,type:this.type,frames:[],frameRate:this.frameRate,duration:this.duration,skipMissedFrames:this.skipMissedFrames,delay:this.delay,repeat:this.repeat,repeatDelay:this.repeatDelay,yoyo:this.yoyo,showBeforeDelay:this.showBeforeDelay,showOnStart:this.showOnStart,randomFrame:this.randomFrame,hideOnComplete:this.hideOnComplete};return this.frames.forEach(function(o){i.frames.push(o.toJSON())}),i},updateFrameSequence:function(){for(var i=this.frames.length,o=1/(i-1),u,l=0;l<i;l++)u=this.frames[l],u.index=l+1,u.isFirst=!1,u.isLast=!1,u.progress=l*o,l===0?(u.isFirst=!0,i===1?(u.isLast=!0,u.nextFrame=u,u.prevFrame=u):(u.isLast=!1,u.prevFrame=this.frames[i-1],u.nextFrame=this.frames[l+1])):l===i-1&&i>1?(u.isLast=!0,u.prevFrame=this.frames[i-2],u.nextFrame=this.frames[0]):i>1&&(u.prevFrame=this.frames[l-1],u.nextFrame=this.frames[l+1]);return this},pause:function(){return this.paused=!0,this},resume:function(){return this.paused=!1,this},destroy:function(){this.manager.off&&(this.manager.off(a.PAUSE_ALL,this.pause,this),this.manager.off(a.RESUME_ALL,this.resume,this)),this.manager.remove(this.key);for(var i=0;i<this.frames.length;i++)this.frames[i].destroy();this.frames=[],this.manager=null}});p.exports=h}),41138:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(83419),c=new d({initialize:function(r,n,e,s,h){h===void 0&&(h=!1),this.textureKey=r,this.textureFrame=n,this.index=e,this.frame=s,this.isFirst=!1,this.isLast=!1,this.prevFrame=null,this.nextFrame=null,this.duration=0,this.progress=0,this.isKeyFrame=h},toJSON:function(){return{key:this.textureKey,frame:this.textureFrame,duration:this.duration,keyframe:this.isKeyFrame}},destroy:function(){this.frame=void 0}});p.exports=c}),60848:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(42099),c=t(83419),a=t(90330),r=t(50792),n=t(74943),e=t(8443),s=t(95540),h=t(35154),i=t(36383),o=t(20283),u=t(41836),l=new c({Extends:r,initialize:function(v){r.call(this),this.game=v,this.textureManager=null,this.globalTimeScale=1,this.anims=new a,this.mixes=new a,this.paused=!1,this.name="AnimationManager",v.events.once(e.BOOT,this.boot,this)},boot:function(){this.textureManager=this.game.textures,this.game.events.once(e.DESTROY,this.destroy,this)},addMix:function(f,v,g){var x=this.anims,m=this.mixes,y=typeof f=="string"?f:f.key,T=typeof v=="string"?v:v.key;if(x.has(y)&&x.has(T)){var C=m.get(y);C||(C={}),C[T]=g,m.set(y,C)}return this},removeMix:function(f,v){var g=this.mixes,x=typeof f=="string"?f:f.key,m=g.get(x);if(m)if(v){var y=typeof v=="string"?v:v.key;m.hasOwnProperty(y)&&delete m[y]}else v||g.delete(x);return this},getMix:function(f,v){var g=this.mixes,x=typeof f=="string"?f:f.key,m=typeof v=="string"?v:v.key,y=g.get(x);return y&&y.hasOwnProperty(m)?y[m]:0},add:function(f,v){return this.anims.has(f)?(console.warn("Animation key exists: "+f),this):(v.key=f,this.anims.set(f,v),this.emit(n.ADD_ANIMATION,f,v),this)},exists:function(f){return this.anims.has(f)},createFromAseprite:function(f,v,g){var x=[],m=this.game.cache.json.get(f);if(!m)return console.warn("No Aseprite data found for: "+f),x;var y=this,T=h(m,"meta",null),C=h(m,"frames",null);if(T&&C){var E=h(T,"frameTags",[]);E.forEach(function(A){var P=[],M=s(A,"name",null),F=s(A,"from",0),L=s(A,"to",0),D=s(A,"direction","forward");if(M&&(!v||v&&v.indexOf(M)>-1)){for(var I=0,U=F;U<=L;U++){var z=U.toString(),w=C[z];if(w){var G=s(w,"duration",i.MAX_SAFE_INTEGER);P.push({key:f,frame:z,duration:G}),I+=G}}D==="reverse"&&(P=P.reverse());var R={key:M,frames:P,duration:I,yoyo:D==="pingpong"},O;g?g.anims&&(O=g.anims.create(R)):O=y.create(R),O&&x.push(O)}})}return x},create:function(f){var v=f.key,g=!1;return v&&(g=this.get(v),g?console.warn("AnimationManager key already exists: "+v):(g=new d(this,v,f),this.anims.set(v,g),this.emit(n.ADD_ANIMATION,v,g))),g},fromJSON:function(f,v){v===void 0&&(v=!1),v&&this.anims.clear(),typeof f=="string"&&(f=JSON.parse(f));var g=[];if(f.hasOwnProperty("anims")&&Array.isArray(f.anims)){for(var x=0;x<f.anims.length;x++)g.push(this.create(f.anims[x]));f.hasOwnProperty("globalTimeScale")&&(this.globalTimeScale=f.globalTimeScale)}else f.hasOwnProperty("key")&&f.type==="frame"&&g.push(this.create(f));return g},generateFrameNames:function(f,v){var g=h(v,"prefix",""),x=h(v,"start",0),m=h(v,"end",0),y=h(v,"suffix",""),T=h(v,"zeroPad",0),C=h(v,"outputArray",[]),E=h(v,"frames",!1);if(!this.textureManager.exists(f))return console.warn('Texture "%s" not found',f),C;var A=this.textureManager.get(f);if(!A)return C;var P;if(v)for(E||(E=o(x,m)),P=0;P<E.length;P++){var M=g+u(E[P],T,"0",1)+y;A.has(M)?C.push({key:f,frame:M}):console.warn('Frame "%s" not found in texture "%s"',M,f)}else for(E=A.getFrameNames(),P=0;P<E.length;P++)C.push({key:f,frame:E[P]});return C},generateFrameNumbers:function(f,v){var g=h(v,"start",0),x=h(v,"end",-1),m=h(v,"first",!1),y=h(v,"outputArray",[]),T=h(v,"frames",!1);if(!this.textureManager.exists(f))return console.warn('Texture "%s" not found',f),y;var C=this.textureManager.get(f);if(!C)return y;m&&C.has(m)&&y.push({key:f,frame:m}),T||(x===-1&&(x=C.frameTotal-2),T=o(g,x));for(var E=0;E<T.length;E++){var A=T[E];C.has(A)?y.push({key:f,frame:A}):console.warn('Frame "%s" not found in texture "%s"',A,f)}return y},get:function(f){return this.anims.get(f)},getAnimsFromTexture:function(f){for(var v=this.textureManager.get(f),g=v.key,x=this.anims.getArray(),m=[],y=0;y<x.length;y++)for(var T=x[y],C=T.frames,E=0;E<C.length;E++)if(C[E].textureKey===g){m.push(T.key);break}return m},pauseAll:function(){return this.paused||(this.paused=!0,this.emit(n.PAUSE_ALL)),this},play:function(f,v){Array.isArray(v)||(v=[v]);for(var g=0;g<v.length;g++)v[g].anims.play(f);return this},staggerPlay:function(f,v,g,x){g===void 0&&(g=0),x===void 0&&(x=!0),Array.isArray(v)||(v=[v]);var m=v.length;x||m--;for(var y=0;y<v.length;y++){var T=g<0?Math.abs(g)*(m-y):g*y;v[y].anims.playAfterDelay(f,T)}return this},remove:function(f){var v=this.get(f);return v&&(this.emit(n.REMOVE_ANIMATION,f,v),this.anims.delete(f),this.removeMix(f)),v},resumeAll:function(){return this.paused&&(this.paused=!1,this.emit(n.RESUME_ALL)),this},toJSON:function(f){var v={anims:[],globalTimeScale:this.globalTimeScale};return f!==void 0&&f!==""?v.anims.push(this.anims.get(f).toJSON()):this.anims.each(function(g,x){v.anims.push(x.toJSON())}),v},destroy:function(){this.anims.clear(),this.mixes.clear(),this.textureManager=null,this.game=null}});p.exports=l}),9674:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(42099),c=t(30976),a=t(83419),r=t(90330),n=t(74943),e=t(95540),s=new a({initialize:function(i){this.parent=i,this.animationManager=i.scene.sys.anims,this.animationManager.on(n.REMOVE_ANIMATION,this.globalRemove,this),this.textureManager=this.animationManager.textureManager,this.anims=null,this.isPlaying=!1,this.hasStarted=!1,this.currentAnim=null,this.currentFrame=null,this.nextAnim=null,this.nextAnimsQueue=[],this.timeScale=1,this.frameRate=0,this.duration=0,this.msPerFrame=0,this.skipMissedFrames=!0,this.randomFrame=!1,this.delay=0,this.repeat=0,this.repeatDelay=0,this.yoyo=!1,this.showBeforeDelay=!1,this.showOnStart=!1,this.hideOnComplete=!1,this.forward=!0,this.inReverse=!1,this.accumulator=0,this.nextTick=0,this.delayCounter=0,this.repeatCounter=0,this.pendingRepeat=!1,this._paused=!1,this._wasPlaying=!1,this._pendingStop=0,this._pendingStopValue},chain:function(h){var i=this.parent;if(h===void 0)return this.nextAnimsQueue.length=0,this.nextAnim=null,i;Array.isArray(h)||(h=[h]);for(var o=0;o<h.length;o++){var u=h[o];this.nextAnim?this.nextAnimsQueue.push(u):this.nextAnim=u}return this.parent},getName:function(){return this.currentAnim?this.currentAnim.key:""},getFrameName:function(){return this.currentFrame?this.currentFrame.textureFrame:""},load:function(h){this.isPlaying&&this.stop();var i=this.animationManager,o=typeof h=="string"?h:e(h,"key",null),u=this.exists(o)?this.get(o):i.get(o);if(!u)console.warn("Missing animation: "+o);else{this.currentAnim=u;var l=u.getTotalFrames(),f=e(h,"frameRate",u.frameRate),v=e(h,"duration",u.duration);u.calculateDuration(this,l,v,f),this.delay=e(h,"delay",u.delay),this.repeat=e(h,"repeat",u.repeat),this.repeatDelay=e(h,"repeatDelay",u.repeatDelay),this.yoyo=e(h,"yoyo",u.yoyo),this.showBeforeDelay=e(h,"showBeforeDelay",u.showBeforeDelay),this.showOnStart=e(h,"showOnStart",u.showOnStart),this.hideOnComplete=e(h,"hideOnComplete",u.hideOnComplete),this.skipMissedFrames=e(h,"skipMissedFrames",u.skipMissedFrames),this.randomFrame=e(h,"randomFrame",u.randomFrame),this.timeScale=e(h,"timeScale",this.timeScale);var g=e(h,"startFrame",0);g>l&&(g=0),this.randomFrame&&(g=c(0,l-1));var x=u.frames[g];g===0&&!this.forward&&(x=u.getLastFrame()),this.currentFrame=x}return this.parent},pause:function(h){return this._paused||(this._paused=!0,this._wasPlaying=this.isPlaying,this.isPlaying=!1),h!==void 0&&this.setCurrentFrame(h),this.parent},resume:function(h){return this._paused&&(this._paused=!1,this.isPlaying=this._wasPlaying),h!==void 0&&this.setCurrentFrame(h),this.parent},playAfterDelay:function(h,i){if(!this.isPlaying)this.delayCounter=i,this.play(h,!0);else{var o=this.nextAnim,u=this.nextAnimsQueue;o&&u.unshift(o),this.nextAnim=h,this._pendingStop=1,this._pendingStopValue=i}return this.parent},playAfterRepeat:function(h,i){if(i===void 0&&(i=1),!this.isPlaying)this.play(h);else{var o=this.nextAnim,u=this.nextAnimsQueue;o&&u.unshift(o),this.repeatCounter!==-1&&i>this.repeatCounter&&(i=this.repeatCounter),this.nextAnim=h,this._pendingStop=2,this._pendingStopValue=i}return this.parent},play:function(h,i){i===void 0&&(i=!1);var o=this.currentAnim,u=this.parent,l=typeof h=="string"?h:h.key;if(i&&this.isPlaying&&o.key===l)return u;if(o&&this.isPlaying){var f=this.animationManager.getMix(o.key,h);if(f>0)return this.playAfterDelay(h,f)}return this.forward=!0,this.inReverse=!1,this._paused=!1,this._wasPlaying=!0,this.startAnimation(h)},playReverse:function(h,i){i===void 0&&(i=!1);var o=typeof h=="string"?h:h.key;return i&&this.isPlaying&&this.currentAnim.key===o?this.parent:(this.forward=!1,this.inReverse=!0,this._paused=!1,this._wasPlaying=!0,this.startAnimation(h))},startAnimation:function(h){this.load(h);var i=this.currentAnim,o=this.parent;return i&&(this.repeatCounter=this.repeat===-1?Number.MAX_VALUE:this.repeat,i.getFirstTick(this),this.isPlaying=!0,this.pendingRepeat=!1,this.hasStarted=!1,this._pendingStop=0,this._pendingStopValue=0,this._paused=!1,this.delayCounter+=this.delay,this.delayCounter===0?this.handleStart():this.showBeforeDelay&&this.setCurrentFrame(this.currentFrame)),o},handleStart:function(){this.showOnStart&&this.parent.setVisible(!0),this.setCurrentFrame(this.currentFrame),this.hasStarted=!0,this.emitEvents(n.ANIMATION_START)},handleRepeat:function(){this.pendingRepeat=!1,this.emitEvents(n.ANIMATION_REPEAT)},handleStop:function(){this._pendingStop=0,this.isPlaying=!1,this.emitEvents(n.ANIMATION_STOP)},handleComplete:function(){this._pendingStop=0,this.isPlaying=!1,this.hideOnComplete&&this.parent.setVisible(!1),this.emitEvents(n.ANIMATION_COMPLETE,n.ANIMATION_COMPLETE_KEY)},emitEvents:function(h,i){var o=this.currentAnim;if(o){var u=this.currentFrame,l=this.parent,f=u.textureFrame;l.emit(h,o,u,l,f),i&&l.emit(i+o.key,o,u,l,f)}},reverse:function(){return this.isPlaying&&(this.inReverse=!this.inReverse,this.forward=!this.forward),this.parent},getProgress:function(){var h=this.currentFrame;if(!h)return 0;var i=h.progress;return this.inReverse&&(i*=-1),i},setProgress:function(h){return this.forward||(h=1-h),this.setCurrentFrame(this.currentAnim.getFrameByProgress(h)),this.parent},setRepeat:function(h){return this.repeatCounter=h===-1?Number.MAX_VALUE:h,this.parent},globalRemove:function(h,i){i===void 0&&(i=this.currentAnim),this.isPlaying&&i.key===this.currentAnim.key&&(this.stop(),this.setCurrentFrame(this.currentAnim.frames[0]))},restart:function(h,i){h===void 0&&(h=!1),i===void 0&&(i=!1);var o=this.currentAnim,u=this.parent;return o?(i&&(this.repeatCounter=this.repeat===-1?Number.MAX_VALUE:this.repeat),o.getFirstTick(this),this.emitEvents(n.ANIMATION_RESTART),this.isPlaying=!0,this.pendingRepeat=!1,this.hasStarted=!h,this._pendingStop=0,this._pendingStopValue=0,this._paused=!1,this.setCurrentFrame(o.frames[0]),this.parent):u},complete:function(){if(this._pendingStop=0,this.isPlaying=!1,this.currentAnim&&this.handleComplete(),this.nextAnim){var h=this.nextAnim;this.nextAnim=this.nextAnimsQueue.length>0?this.nextAnimsQueue.shift():null,this.play(h)}return this.parent},stop:function(){if(this._pendingStop=0,this.isPlaying=!1,this.delayCounter=0,this.currentAnim&&this.handleStop(),this.nextAnim){var h=this.nextAnim;this.nextAnim=this.nextAnimsQueue.shift(),this.play(h)}return this.parent},stopAfterDelay:function(h){return this._pendingStop=1,this._pendingStopValue=h,this.parent},stopAfterRepeat:function(h){return h===void 0&&(h=1),this.repeatCounter!==-1&&h>this.repeatCounter&&(h=this.repeatCounter),this._pendingStop=2,this._pendingStopValue=h,this.parent},stopOnFrame:function(h){return this._pendingStop=3,this._pendingStopValue=h,this.parent},getTotalFrames:function(){return this.currentAnim?this.currentAnim.getTotalFrames():0},update:function(h,i){var o=this.currentAnim;if(!(!this.isPlaying||!o||o.paused)){if(this.accumulator+=i*this.timeScale*this.animationManager.globalTimeScale,this._pendingStop===1&&(this._pendingStopValue-=i,this._pendingStopValue<=0))return this.stop();if(!this.hasStarted)this.accumulator>=this.delayCounter&&(this.accumulator-=this.delayCounter,this.handleStart());else if(this.accumulator>=this.nextTick&&(this.forward?o.nextFrame(this):o.previousFrame(this),this.isPlaying&&this._pendingStop===0&&this.skipMissedFrames&&this.accumulator>this.nextTick)){var u=0;do this.forward?o.nextFrame(this):o.previousFrame(this),u++;while(this.isPlaying&&this.accumulator>this.nextTick&&u<60)}}},setCurrentFrame:function(h){var i=this.parent;return this.currentFrame=h,i.texture=h.frame.texture,i.frame=h.frame,i.isCropped&&i.frame.updateCropUVs(i._crop,i.flipX,i.flipY),h.setAlpha&&(i.alpha=h.alpha),i.setSizeToFrame(),i._originComponent&&(h.frame.customPivot?i.setOrigin(h.frame.pivotX,h.frame.pivotY):i.updateDisplayOrigin()),this.isPlaying&&this.hasStarted&&(this.emitEvents(n.ANIMATION_UPDATE),this._pendingStop===3&&this._pendingStopValue===h&&this.stop()),i},nextFrame:function(){return this.currentAnim&&this.currentAnim.nextFrame(this),this.parent},previousFrame:function(){return this.currentAnim&&this.currentAnim.previousFrame(this),this.parent},get:function(h){return this.anims?this.anims.get(h):null},exists:function(h){return this.anims?this.anims.has(h):!1},create:function(h){var i=h.key,o=!1;return i&&(o=this.get(i),o?console.warn("Animation key already exists: "+i):(o=new d(this,i,h),this.anims||(this.anims=new r),this.anims.set(i,o))),o},createFromAseprite:function(h,i){return this.animationManager.createFromAseprite(h,i,this.parent)},generateFrameNames:function(h,i){return this.animationManager.generateFrameNames(h,i)},generateFrameNumbers:function(h,i){return this.animationManager.generateFrameNumbers(h,i)},remove:function(h){var i=this.get(h);return i&&(this.currentAnim===i&&this.stop(),this.anims.delete(h)),i},destroy:function(){this.animationManager.off(n.REMOVE_ANIMATION,this.globalRemove,this),this.anims&&this.anims.clear(),this.animationManager=null,this.parent=null,this.nextAnim=null,this.nextAnimsQueue.length=0,this.currentAnim=null,this.currentFrame=null},isPaused:{get:function(){return this._paused}}});p.exports=s}),57090:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="add"}),25312:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationcomplete"}),89580:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationcomplete-"}),52860:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationrepeat"}),63850:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationrestart"}),99085:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationstart"}),28087:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationstop"}),1794:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="animationupdate"}),52562:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="pauseall"}),57953:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="remove"}),68339:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="resumeall"}),74943:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports={ADD_ANIMATION:t(57090),ANIMATION_COMPLETE:t(25312),ANIMATION_COMPLETE_KEY:t(89580),ANIMATION_REPEAT:t(52860),ANIMATION_RESTART:t(63850),ANIMATION_START:t(99085),ANIMATION_STOP:t(28087),ANIMATION_UPDATE:t(1794),PAUSE_ALL:t(52562),REMOVE_ANIMATION:t(57953),RESUME_ALL:t(68339)}}),60421:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports={Animation:t(42099),AnimationFrame:t(41138),AnimationManager:t(60848),AnimationState:t(9674),Events:t(74943)}}),2161:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(83419),c=t(90330),a=t(50792),r=t(24736),n=new d({initialize:function(){this.entries=new c,this.events=new a},add:function(e,s){return this.entries.set(e,s),this.events.emit(r.ADD,this,e,s),this},has:function(e){return this.entries.has(e)},exists:function(e){return this.entries.has(e)},get:function(e){return this.entries.get(e)},remove:function(e){var s=this.get(e);return s&&(this.entries.delete(e),this.events.emit(r.REMOVE,this,e,s.data)),this},getKeys:function(){return this.entries.keys()},destroy:function(){this.entries.clear(),this.events.removeAllListeners(),this.entries=null,this.events=null}});p.exports=n}),24047:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(2161),c=t(83419),a=t(8443),r=new c({initialize:function(e){this.game=e,this.binary=new d,this.bitmapFont=new d,this.json=new d,this.physics=new d,this.shader=new d,this.audio=new d,this.video=new d,this.text=new d,this.html=new d,this.obj=new d,this.tilemap=new d,this.xml=new d,this.custom={},this.game.events.once(a.DESTROY,this.destroy,this)},addCustom:function(n){return this.custom.hasOwnProperty(n)||(this.custom[n]=new d),this.custom[n]},destroy:function(){for(var n=["binary","bitmapFont","json","physics","shader","audio","video","text","html","obj","tilemap","xml"],e=0;e<n.length;e++)this[n[e]].destroy(),this[n[e]]=null;for(var s in this.custom)this.custom[s].destroy();this.custom=null,this.game=null}});p.exports=r}),51464:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="add"}),59261:(p=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports="remove"}),24736:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports={ADD:t(51464),REMOVE:t(59261)}}),83388:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */p.exports={BaseCache:t(2161),CacheManager:t(24047),Events:t(24736)}}),71911:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(83419),c=t(31401),a=t(39506),r=t(50792),n=t(19715),e=t(87841),s=t(61340),h=t(80333),i=t(26099),o=new d({Extends:r,Mixins:[c.AlphaSingle,c.Visible],initialize:function(l,f,v,g){l===void 0&&(l=0),f===void 0&&(f=0),v===void 0&&(v=0),g===void 0&&(g=0),r.call(this),this.scene,this.sceneManager,this.scaleManager,this.cameraManager,this.id=0,this.name="",this.roundPixels=!1,this.useBounds=!1,this.worldView=new e,this.dirty=!0,this._x=l,this._y=f,this._width=v,this._height=g,this._bounds=new e,this._scrollX=0,this._scrollY=0,this._zoomX=1,this._zoomY=1,this._rotation=0,this.matrix=new s,this.transparent=!0,this.backgroundColor=h("rgba(0,0,0,0)"),this.disableCull=!1,this.culledObjects=[],this.midPoint=new i(v/2,g/2),this.originX=.5,this.originY=.5,this._customViewport=!1,this.mask=null,this._maskCamera=null,this.renderList=[],this.isSceneCamera=!0},addToRenderList:function(u){this.renderList.push(u)},setOrigin:function(u,l){return u===void 0&&(u=.5),l===void 0&&(l=u),this.originX=u,this.originY=l,this},getScroll:function(u,l,f){f===void 0&&(f=new i);var v=this.width*.5,g=this.height*.5;return f.x=u-v,f.y=l-g,this.useBounds&&(f.x=this.clampX(f.x),f.y=this.clampY(f.y)),f},centerOnX:function(u){var l=this.width*.5;return this.midPoint.x=u,this.scrollX=u-l,this.useBounds&&(this.scrollX=this.clampX(this.scrollX)),this},centerOnY:function(u){var l=this.height*.5;return this.midPoint.y=u,this.scrollY=u-l,this.useBounds&&(this.scrollY=this.clampY(this.scrollY)),this},centerOn:function(u,l){return this.centerOnX(u),this.centerOnY(l),this},centerToBounds:function(){if(this.useBounds){var u=this._bounds,l=this.width*.5,f=this.height*.5;this.midPoint.set(u.centerX,u.centerY),this.scrollX=u.centerX-l,this.scrollY=u.centerY-f}return this},centerToSize:function(){return this.scrollX=this.width*.5,this.scrollY=this.height*.5,this},cull:function(u){if(this.disableCull)return u;var l=this.matrix.matrix,f=l[0],v=l[1],g=l[2],x=l[3],m=f*x-v*g;if(!m)return u;var y=l[4],T=l[5],C=this.scrollX,E=this.scrollY,A=this.width,P=this.height,M=this.y,F=M+P,L=this.x,D=L+A,I=this.culledObjects,U=u.length;m=1/m,I.length=0;for(var z=0;z<U;++z){var w=u[z];if(!w.hasOwnProperty("width")||w.parentContainer){I.push(w);continue}var G=w.width,R=w.height,O=w.x-C*w.scrollFactorX-G*w.originX,B=w.y-E*w.scrollFactorY-R*w.originY,N=O*f+B*g+y,X=O*v+B*x+T,V=(O+G)*f+(B+R)*g+y,Y=(O+G)*v+(B+R)*x+T;V>L&&N<D&&Y>M&&X<F&&I.push(w)}return I},getWorldPoint:function(u,l,f){f===void 0&&(f=new i);var v=this.matrix.matrix,g=v[0],x=v[1],m=v[2],y=v[3],T=v[4],C=v[5],E=g*y-x*m;if(!E)return f.x=u,f.y=l,f;E=1/E;var A=y*E,P=-x*E,M=-m*E,F=g*E,L=(m*C-y*T)*E,D=(x*T-g*C)*E,I=Math.cos(this.rotation),U=Math.sin(this.rotation),z=this.zoomX,w=this.zoomY,G=this.scrollX,R=this.scrollY,O=u+(G*I-R*U)*z,B=l+(G*U+R*I)*w;return f.x=O*A+B*M+L,f.y=O*P+B*F+D,f},ignore:function(u){var l=this.id;Array.isArray(u)||(u=[u]);for(var f=0;f<u.length;f++){var v=u[f];Array.isArray(v)?this.ignore(v):v.isParent?this.ignore(v.getChildren()):v.cameraFilter|=l}return this},preRender:function(){this.renderList.length=0;var u=this.width,l=this.height,f=u*.5,v=l*.5,g=this.zoomX,x=this.zoomY,m=this.matrix,y=u*this.originX,T=l*this.originY,C=this.scrollX,E=this.scrollY;this.useBounds&&(C=this.clampX(C),E=this.clampY(E)),this.scrollX=C,this.scrollY=E;var A=C+f,P=E+v;this.midPoint.set(A,P);var M=u/g,F=l/x;this.worldView.setTo(A-M/2,P-F/2,M,F),m.applyITRS(this.x+y,this.y+T,this.rotation,g,x),m.translate(-y,-T)},clampX:function(u){var l=this._bounds,f=this.displayWidth,v=l.x+(f-this.width)/2,g=Math.max(v,v+l.width-f);return u<v?u=v:u>g&&(u=g),u},clampY:function(u){var l=this._bounds,f=this.displayHeight,v=l.y+(f-this.height)/2,g=Math.max(v,v+l.height-f);return u<v?u=v:u>g&&(u=g),u},removeBounds:function(){return this.useBounds=!1,this.dirty=!0,this._bounds.setEmpty(),this},setAngle:function(u){return u===void 0&&(u=0),this.rotation=a(u),this},setBackgroundColor:function(u){return u===void 0&&(u="rgba(0,0,0,0)"),this.backgroundColor=h(u),this.transparent=this.backgroundColor.alpha===0,this},setBounds:function(u,l,f,v,g){return g===void 0&&(g=!1),this._bounds.setTo(u,l,f,v),this.dirty=!0,this.useBounds=!0,g?this.centerToBounds():(this.scrollX=this.clampX(this.scrollX),this.scrollY=this.clampY(this.scrollY)),this},getBounds:function(u){u===void 0&&(u=new e);var l=this._bounds;return u.setTo(l.x,l.y,l.width,l.height),u},setName:function(u){return u===void 0&&(u=""),this.name=u,this},setPosition:function(u,l){return l===void 0&&(l=u),this.x=u,this.y=l,this},setRotation:function(u){return u===void 0&&(u=0),this.rotation=u,this},setRoundPixels:function(u){return this.roundPixels=u,this},setScene:function(u,l){l===void 0&&(l=!0),this.scene&&this._customViewport&&this.sceneManager.customViewports--,this.scene=u,this.isSceneCamera=l;var f=u.sys;return this.sceneManager=f.game.scene,this.scaleManager=f.scale,this.cameraManager=f.cameras,this.updateSystem(),this},setScroll:function(u,l){return l===void 0&&(l=u),this.scrollX=u,this.scrollY=l,this},setSize:function(u,l){return l===void 0&&(l=u),this.width=u,this.height=l,this},setViewport:function(u,l,f,v){return this.x=u,this.y=l,this.width=f,this.height=v,this},setZoom:function(u,l){return u===void 0&&(u=1),l===void 0&&(l=u),u===0&&(u=.001),l===0&&(l=.001),this.zoomX=u,this.zoomY=l,this},setMask:function(u,l){return l===void 0&&(l=!0),this.mask=u,this._maskCamera=l?this.cameraManager.default:this,this},clearMask:function(u){return u===void 0&&(u=!1),u&&this.mask&&this.mask.destroy(),this.mask=null,this},toJSON:function(){var u={name:this.name,x:this.x,y:this.y,width:this.width,height:this.height,zoom:this.zoom,rotation:this.rotation,roundPixels:this.roundPixels,scrollX:this.scrollX,scrollY:this.scrollY,backgroundColor:this.backgroundColor.rgba};return this.useBounds&&(u.bounds={x:this._bounds.x,y:this._bounds.y,width:this._bounds.width,height:this._bounds.height}),u},update:function(){},setIsSceneCamera:function(u){return this.isSceneCamera=u,this},updateSystem:function(){if(!(!this.scaleManager||!this.isSceneCamera)){var u=this._x!==0||this._y!==0||this.scaleManager.width!==this._width||this.scaleManager.height!==this._height,l=this.sceneManager;u&&!this._customViewport?l.customViewports++:!u&&this._customViewport&&l.customViewports--,this.dirty=!0,this._customViewport=u}},destroy:function(){this.emit(n.DESTROY,this),this.removeAllListeners(),this.matrix.destroy(),this.culledObjects=[],this._customViewport&&this.sceneManager.customViewports--,this.renderList=[],this._bounds=null,this.scene=null,this.scaleManager=null,this.sceneManager=null,this.cameraManager=null},x:{get:function(){return this._x},set:function(u){this._x=u,this.updateSystem()}},y:{get:function(){return this._y},set:function(u){this._y=u,this.updateSystem()}},width:{get:function(){return this._width},set:function(u){this._width=u,this.updateSystem()}},height:{get:function(){return this._height},set:function(u){this._height=u,this.updateSystem()}},scrollX:{get:function(){return this._scrollX},set:function(u){u!==this._scrollX&&(this._scrollX=u,this.dirty=!0)}},scrollY:{get:function(){return this._scrollY},set:function(u){u!==this._scrollY&&(this._scrollY=u,this.dirty=!0)}},zoom:{get:function(){return(this._zoomX+this._zoomY)/2},set:function(u){this._zoomX=u,this._zoomY=u,this.dirty=!0}},zoomX:{get:function(){return this._zoomX},set:function(u){this._zoomX=u,this.dirty=!0}},zoomY:{get:function(){return this._zoomY},set:function(u){this._zoomY=u,this.dirty=!0}},rotation:{get:function(){return this._rotation},set:function(u){this._rotation=u,this.dirty=!0}},centerX:{get:function(){return this.x+.5*this.width}},centerY:{get:function(){return this.y+.5*this.height}},displayWidth:{get:function(){return this.width/this.zoomX}},displayHeight:{get:function(){return this.height/this.zoomY}}});p.exports=o}),38058:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(71911),c=t(67502),a=t(45319),r=t(83419),n=t(31401),e=t(20052),s=t(19715),h=t(28915),i=t(87841),o=t(26099),u=new r({Extends:d,Mixins:[n.PostPipeline],initialize:function(f,v,g,x){d.call(this,f,v,g,x),this.initPostPipeline(),this.inputEnabled=!0,this.fadeEffect=new e.Fade(this),this.flashEffect=new e.Flash(this),this.shakeEffect=new e.Shake(this),this.panEffect=new e.Pan(this),this.rotateToEffect=new e.RotateTo(this),this.zoomEffect=new e.Zoom(this),this.lerp=new o(1,1),this.followOffset=new o,this.deadzone=null,this._follow=null},setDeadzone:function(l,f){if(l===void 0)this.deadzone=null;else{if(this.deadzone?(this.deadzone.width=l,this.deadzone.height=f):this.deadzone=new i(0,0,l,f),this._follow){var v=this.width/2,g=this.height/2,x=this._follow.x-this.followOffset.x,m=this._follow.y-this.followOffset.y;this.midPoint.set(x,m),this.scrollX=x-v,this.scrollY=m-g}c(this.deadzone,this.midPoint.x,this.midPoint.y)}return this},fadeIn:function(l,f,v,g,x,m){return this.fadeEffect.start(!1,l,f,v,g,!0,x,m)},fadeOut:function(l,f,v,g,x,m){return this.fadeEffect.start(!0,l,f,v,g,!0,x,m)},fadeFrom:function(l,f,v,g,x,m,y){return this.fadeEffect.start(!1,l,f,v,g,x,m,y)},fade:function(l,f,v,g,x,m,y){return this.fadeEffect.start(!0,l,f,v,g,x,m,y)},flash:function(l,f,v,g,x,m,y){return this.flashEffect.start(l,f,v,g,x,m,y)},shake:function(l,f,v,g,x){return this.shakeEffect.start(l,f,v,g,x)},pan:function(l,f,v,g,x,m,y){return this.panEffect.start(l,f,v,g,x,m,y)},rotateTo:function(l,f,v,g,x,m,y){return this.rotateToEffect.start(l,f,v,g,x,m,y)},zoomTo:function(l,f,v,g,x,m){return this.zoomEffect.start(l,f,v,g,x,m)},preRender:function(){this.renderList.length=0;var l=this.width,f=this.height,v=l*.5,g=f*.5,x=this.zoom,m=this.matrix,y=l*this.originX,T=f*this.originY,C=this._follow,E=this.deadzone,A=this.scrollX,P=this.scrollY;E&&c(E,this.midPoint.x,this.midPoint.y);var M=!1;if(C&&!this.panEffect.isRunning){var F=this.lerp,L=C.x-this.followOffset.x,D=C.y-this.followOffset.y;E?(L<E.x?A=h(A,A-(E.x-L),F.x):L>E.right&&(A=h(A,A+(L-E.right),F.x)),D<E.y?P=h(P,P-(E.y-D),F.y):D>E.bottom&&(P=h(P,P+(D-E.bottom),F.y))):(A=h(A,L-y,F.x),P=h(P,D-T,F.y)),M=!0}this.useBounds&&(A=this.clampX(A),P=this.clampY(P)),this.scrollX=A,this.scrollY=P;var I=A+v,U=P+g;this.midPoint.set(I,U);var z=l/x,w=f/x,G=Math.floor(I-z/2),R=Math.floor(U-w/2);this.worldView.setTo(G,R,z,w),m.applyITRS(Math.floor(this.x+y),Math.floor(this.y+T),this.rotation,x,x),m.translate(-y,-T),this.shakeEffect.preRender(),M&&this.emit(s.FOLLOW_UPDATE,this,C)},setLerp:function(l,f){return l===void 0&&(l=1),f===void 0&&(f=l),this.lerp.set(l,f),this},setFollowOffset:function(l,f){return l===void 0&&(l=0),f===void 0&&(f=0),this.followOffset.set(l,f),this},startFollow:function(l,f,v,g,x,m){f===void 0&&(f=!1),v===void 0&&(v=1),g===void 0&&(g=v),x===void 0&&(x=0),m===void 0&&(m=x),this._follow=l,this.roundPixels=f,v=a(v,0,1),g=a(g,0,1),this.lerp.set(v,g),this.followOffset.set(x,m);var y=this.width/2,T=this.height/2,C=l.x-x,E=l.y-m;return this.midPoint.set(C,E),this.scrollX=C-y,this.scrollY=E-T,this.useBounds&&(this.scrollX=this.clampX(this.scrollX),this.scrollY=this.clampY(this.scrollY)),this},stopFollow:function(){return this._follow=null,this},resetFX:function(){return this.rotateToEffect.reset(),this.panEffect.reset(),this.shakeEffect.reset(),this.flashEffect.reset(),this.fadeEffect.reset(),this},update:function(l,f){this.visible&&(this.rotateToEffect.update(l,f),this.panEffect.update(l,f),this.zoomEffect.update(l,f),this.shakeEffect.update(l,f),this.flashEffect.update(l,f),this.fadeEffect.update(l,f))},destroy:function(){this.resetFX(),d.prototype.destroy.call(this),this._follow=null,this.deadzone=null}});p.exports=u}),32743:((p,S,t)=>{/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2024 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */var d=t(38058),c=t(83419),a=t(95540),r=t(37277),n=t(37303),e=t(97480),s=t(44594),h=new c({initialize:function(o){this.scene=o,this.systems=o.sys,this.roundPixels=o.sys.game.config.roundPixels,this.cameras=[],this.main,this.default,o.sys.events.once(s.BOOT,this.boot,this),o.sys.events.on(s.START,this.start,this)},boot:function(){var i=this.systems;i.settings.cameras?this.fromJSON(i.settings.cameras):this.add(),this.main=this.cameras[0],this.default=new d(0,0,i.scale.width,i.scale.height).setScene(this.scene),i.game.scale.on(e.RESIZE,this.onResize,this),this.systems.events.once(s.DESTROY,this.destroy,this)},start:function(){if(!this.main){var i=this.systems;i.settings.cameras?this.fromJSON(i.settings.cameras):this.add(),this.main=this.cameras[0]}var o=this.systems.events;o.on(s.UPDATE,this.update,this),o.once(s.SHUTDOWN,this.shutdown,this)},add:function(i,o,u,l,f,v){i===void 0&&(i=0),o===void 0&&(o=0),u===void 0&&(u=this.scene.sys.scale.width),l===void 0&&(l=this.scene.sys.scale.height),f===void 0&&(f=!1),v===void 0&&(v="");var g=new d(i,o,u,l);return g.setName(v),g.setScene(this.scene),g.setRoundPixels(this.roundPixels),g.id=this.getNextID(),this.cameras.push(g),f&&(this.main=g),g},addExisting:function(i,o){o===void 0&&(o=!1);var u=this.cameras.indexOf(i);return u===-1?(i.id=this.getNextID(),i.setRoundPixels(this.roundPixels),this.cameras.push(i),o&&(this.main=i),i):null},getNextID:function(){for(var i=this.cameras,o=1,u=0;u<32;u++){for(var l=!1,f=0;f<i.length;f++){var v=i[f];if(v&&v.id===o){l=!0;continue}}if(l)o=o<<1;else return o}return 0},getTotal:function(i){i===void 0&&(i=!1);for(var o=0,u=this.cameras,l=0;l<u.length;l++){var f=u[l];(!i||i&&f.visible)&&o++}return o},fromJSON:function(i){Array.isArray(i)||(i=[i]);for(var o=this.scene.sys.scale.width,u=this.scene.sys.scale.height,l=0;l<i.length;l++){var f=i[l],v=a(f,"x",0),g=a(f,"y",0),x=a(f,"width",o),m=a(f,"height",u),y=this.add(v,g,x,m);y.name=a(f,"name",""),y.zoom=a(f,"zoom",1),y.rotation=a(f,"rotation",0),y.scrollX=a(f,"scrollX",0),y.scrollY=a(f,"scrollY",0),y.roundPixels=a(f,"roundPixels",!1),y.visible=a(f,"visible",!0);var T=a(f,"backgroundColor",!1);T&&y.setBackgroundColor(T);var C=a(f,"bounds",null);if(C){var E=a(C,"x",0),A=a(C,"y",0),P=a(C,"width",o),M=a(C,"height",u);y.setBounds(E,A,P,M)}}return this},getCamera:function(i){for(var o=this.cameras,u=0;u<o.length;u++)if(o[u].name===i)return o[u];return null},getCamerasBelowPointer:function(i){for(var o=this.cameras,u=i.x,l=i.y,f=[],v=0;v<o.length;v++){var g=o[v];g.visible&&g.inputEnabled&&n(g,u,l)&&f.unshift(g)}return f},remove:function(i,o){o===void 0&&(o=!0),Array.isArray(i)||(i=[i]);for(var u=0,l=this.cameras,f=0;f<i.length;f++){var v=l.indexOf(i[f]);v!==-1&&(o?l[v].destroy():l[v].renderList=[],l.splice(v,1),u++)}return!this.main&&l[0]&&(this.main=l[0