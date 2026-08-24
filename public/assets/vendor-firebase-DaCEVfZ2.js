const U_="modulepreload",H_=function(r){return"/"+r},Cd={},XC=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");s=Promise.allSettled(t.map(c=>{if(c=H_(c),c in Cd)return;Cd[c]=!0;const B=c.endsWith(".css"),h=B?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${h}`))return;const d=document.createElement("link");if(d.rel=B?"stylesheet":U_,B||(d.as="script"),d.crossOrigin="",d.href=c,a&&d.setAttribute("nonce",a),document.head.appendChild(d),B)return new Promise((C,I)=>{d.addEventListener("load",C),d.addEventListener("error",()=>I(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&i(a.reason);return e().catch(i)})};/*! Capacitor: https://capacitorjs.com/ - MIT License */var Ts;(function(r){r.Unimplemented="UNIMPLEMENTED",r.Unavailable="UNAVAILABLE"})(Ts||(Ts={}));class mc extends Error{constructor(e,t,n){super(e),this.message=e,this.code=t,this.data=n}}const j_=r=>{var e,t;return r?.androidBridge?"android":!((t=(e=r?.webkit)===null||e===void 0?void 0:e.messageHandlers)===null||t===void 0)&&t.bridge?"ios":"web"},q_=r=>{const e=r.CapacitorCustomPlatform||null,t=r.Capacitor||{},n=t.Plugins=t.Plugins||{},s=()=>e!==null?e.name:j_(r),i=()=>s()!=="web",o=d=>{const C=B.get(d);return!!(C?.platforms.has(s())||a(d))},a=d=>{var C;return(C=t.PluginHeaders)===null||C===void 0?void 0:C.find(I=>I.name===d)},c=d=>r.console.error(d),B=new Map,h=(d,C={})=>{const I=B.get(d);if(I)return console.warn(`Capacitor plugin "${d}" already registered. Cannot register plugins twice.`),I.proxy;const R=s(),N=a(d);let M;const K=async()=>(!M&&R in C?M=typeof C[R]=="function"?M=await C[R]():M=C[R]:e!==null&&!M&&"web"in C&&(M=typeof C.web=="function"?M=await C.web():M=C.web),M),Z=(m,D)=>{var v,w;if(N){const P=N?.methods.find(_=>D===_.name);if(P)return P.rtype==="promise"?_=>t.nativePromise(d,D.toString(),_):(_,Le)=>t.nativeCallback(d,D.toString(),_,Le);if(m)return(v=m[D])===null||v===void 0?void 0:v.bind(m)}else{if(m)return(w=m[D])===null||w===void 0?void 0:w.bind(m);throw new mc(`"${d}" plugin is not implemented on ${R}`,Ts.Unimplemented)}},te=m=>{let D;const v=(...w)=>{const P=K().then(_=>{const Le=Z(_,m);if(Le){const vt=Le(...w);return D=vt?.remove,vt}else throw new mc(`"${d}.${m}()" is not implemented on ${R}`,Ts.Unimplemented)});return m==="addListener"&&(P.remove=async()=>D()),P};return v.toString=()=>`${m.toString()}() { [capacitor code] }`,Object.defineProperty(v,"name",{value:m,writable:!1,configurable:!1}),v},ce=te("addListener"),fe=te("removeListener"),oe=(m,D)=>{const v=ce({eventName:m},D),w=async()=>{const _=await v;fe({eventName:m,callbackId:_},D)},P=new Promise(_=>v.then(()=>_({remove:w})));return P.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await w()},P},y=new Proxy({},{get(m,D){switch(D){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return N?oe:ce;case"removeListener":return fe;default:return te(D)}}});return n[d]=y,B.set(d,{name:d,proxy:y,platforms:new Set([...Object.keys(C),...N?[R]:[]])}),y};return t.convertFileSrc||(t.convertFileSrc=d=>d),t.getPlatform=s,t.handleError=c,t.isNativePlatform=i,t.isPluginAvailable=o,t.registerPlugin=h,t.Exception=mc,t.DEBUG=!!t.DEBUG,t.isLoggingEnabled=!!t.isLoggingEnabled,t},J_=r=>r.Capacitor=q_(r),Hc=J_(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Eo=Hc.registerPlugin;class _o{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(e,t){let n=!1;this.listeners[e]||(this.listeners[e]=[],n=!0),this.listeners[e].push(t);const i=this.windowListeners[e];i&&!i.registered&&this.addWindowListener(i),n&&this.sendRetainedArgumentsForEvent(e);const o=async()=>this.removeListener(e,t);return Promise.resolve({remove:o})}async removeAllListeners(){this.listeners={};for(const e in this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,t,n){const s=this.listeners[e];if(!s){if(n){let i=this.retainedEventArguments[e];i||(i=[]),i.push(t),this.retainedEventArguments[e]=i}return}s.forEach(i=>i(t))}hasListeners(e){var t;return!!(!((t=this.listeners[e])===null||t===void 0)&&t.length)}registerWindowListener(e,t){this.windowListeners[t]={registered:!1,windowEventName:e,pluginEventName:t,handler:n=>{this.notifyListeners(t,n)}}}unimplemented(e="not implemented"){return new Hc.Exception(e,Ts.Unimplemented)}unavailable(e="not available"){return new Hc.Exception(e,Ts.Unavailable)}async removeListener(e,t){const n=this.listeners[e];if(!n)return;const s=n.indexOf(t);this.listeners[e].splice(s,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){const t=this.retainedEventArguments[e];t&&(delete this.retainedEventArguments[e],t.forEach(n=>{this.notifyListeners(e,n)}))}}const pd=r=>encodeURIComponent(r).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),gd=r=>r.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class K_ extends _o{async getCookies(){const e=document.cookie,t={};return e.split(";").forEach(n=>{if(n.length<=0)return;let[s,i]=n.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");s=gd(s).trim(),i=gd(i).trim(),t[s]=i}),t}async setCookie(e){try{const t=pd(e.key),n=pd(e.value),s=e.expires?`; expires=${e.expires.replace("expires=","")}`:"",i=(e.path||"/").replace("path=",""),o=e.url!=null&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${t}=${n||""}${s}; path=${i}; ${o};`}catch(t){return Promise.reject(t)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(t){return Promise.reject(t)}}async clearCookies(){try{const e=document.cookie.split(";")||[];for(const t of e)document.cookie=t.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}Eo("CapacitorCookies",{web:()=>new K_});const z_=async r=>new Promise((e,t)=>{const n=new FileReader;n.onload=()=>{const s=n.result;e(s.indexOf(",")>=0?s.split(",")[1]:s)},n.onerror=s=>t(s),n.readAsDataURL(r)}),$_=(r={})=>{const e=Object.keys(r);return Object.keys(r).map(s=>s.toLocaleLowerCase()).reduce((s,i,o)=>(s[i]=r[e[o]],s),{})},Q_=(r,e=!0)=>r?Object.entries(r).reduce((n,s)=>{const[i,o]=s;let a,c;return Array.isArray(o)?(c="",o.forEach(B=>{a=e?encodeURIComponent(B):B,c+=`${i}=${a}&`}),c.slice(0,-1)):(a=e?encodeURIComponent(o):o,c=`${i}=${a}`),`${n}&${c}`},"").substr(1):null,W_=(r,e={})=>{const t=Object.assign({method:r.method||"GET",headers:r.headers},e),s=$_(r.headers)["content-type"]||"";if(typeof r.data=="string")t.body=r.data;else if(s.includes("application/x-www-form-urlencoded")){const i=new URLSearchParams;for(const[o,a]of Object.entries(r.data||{}))i.set(o,a);t.body=i.toString()}else if(s.includes("multipart/form-data")||r.data instanceof FormData){const i=new FormData;if(r.data instanceof FormData)r.data.forEach((a,c)=>{i.append(c,a)});else for(const a of Object.keys(r.data))i.append(a,r.data[a]);t.body=i;const o=new Headers(t.headers);o.delete("content-type"),t.headers=o}else(s.includes("application/json")||typeof r.data=="object")&&(t.body=JSON.stringify(r.data));return t};class Y_ extends _o{async request(e){const t=W_(e,e.webFetchExtra),n=Q_(e.params,e.shouldEncodeUrlParams),s=n?`${e.url}?${n}`:e.url,i=await fetch(s,t),o=i.headers.get("content-type")||"";let{responseType:a="text"}=i.ok?e:{};o.includes("application/json")&&(a="json");let c,B;switch(a){case"arraybuffer":case"blob":B=await i.blob(),c=await z_(B);break;case"json":c=await i.json();break;case"document":case"text":default:c=await i.text()}const h={};return i.headers.forEach((d,C)=>{h[C]=d}),{data:c,headers:h,status:i.status,url:i.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}Eo("CapacitorHttp",{web:()=>new Y_});var md;(function(r){r.Dark="DARK",r.Light="LIGHT",r.Default="DEFAULT"})(md||(md={}));var Ed;(function(r){r.StatusBar="StatusBar",r.NavigationBar="NavigationBar"})(Ed||(Ed={}));class X_ extends _o{async setStyle(){this.unavailable("not available for web")}async setAnimation(){this.unavailable("not available for web")}async show(){this.unavailable("not available for web")}async hide(){this.unavailable("not available for web")}}Eo("SystemBars",{web:()=>new X_});/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Z_=()=>{};var _d={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZC=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let s=r.charCodeAt(n);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(s=65536+((s&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},eD=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const s=r[t++];if(s<128)e[n++]=String.fromCharCode(s);else if(s>191&&s<224){const i=r[t++];e[n++]=String.fromCharCode((s&31)<<6|i&63)}else if(s>239&&s<365){const i=r[t++],o=r[t++],a=r[t++],c=((s&7)<<18|(i&63)<<12|(o&63)<<6|a&63)-65536;e[n++]=String.fromCharCode(55296+(c>>10)),e[n++]=String.fromCharCode(56320+(c&1023))}else{const i=r[t++],o=r[t++];e[n++]=String.fromCharCode((s&15)<<12|(i&63)<<6|o&63)}}return e.join("")},ep={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let s=0;s<r.length;s+=3){const i=r[s],o=s+1<r.length,a=o?r[s+1]:0,c=s+2<r.length,B=c?r[s+2]:0,h=i>>2,d=(i&3)<<4|a>>4;let C=(a&15)<<2|B>>6,I=B&63;c||(I=64,o||(C=64)),n.push(t[h],t[d],t[C],t[I])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(ZC(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):eD(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let s=0;s<r.length;){const i=t[r.charAt(s++)],a=s<r.length?t[r.charAt(s)]:0;++s;const B=s<r.length?t[r.charAt(s)]:64;++s;const d=s<r.length?t[r.charAt(s)]:64;if(++s,i==null||a==null||B==null||d==null)throw new tD;const C=i<<2|a>>4;if(n.push(C),B!==64){const I=a<<4&240|B>>2;if(n.push(I),d!==64){const R=B<<6&192|d;n.push(R)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class tD extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const nD=function(r){const e=ZC(r);return ep.encodeByteArray(e,!0)},Sa=function(r){return nD(r).replace(/\./g,"")},tp=function(r){try{return ep.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function np(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rD=()=>np().__FIREBASE_DEFAULTS__,sD=()=>{if(typeof process>"u"||typeof _d>"u")return;const r=_d.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},iD=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&tp(r[1]);return e&&JSON.parse(e)},Bu=()=>{try{return Z_()||rD()||sD()||iD()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},rp=r=>Bu()?.emulatorHosts?.[r],oD=r=>{const e=rp(r);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const n=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),n]:[e.substring(0,t),n]},sp=()=>Bu()?.config,ip=r=>Bu()?.[`_${r}`];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class op{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function aD(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",s=r.iat||0,i=r.sub||r.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:s,exp:s+3600,auth_time:s,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Sa(JSON.stringify(t)),Sa(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Me(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function uD(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Me())}function ap(){const r=Bu()?.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function cD(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function xB(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function BD(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function lD(){const r=Me();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function up(){return!ap()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function cp(){return!ap()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function lu(){try{return typeof indexedDB=="object"}catch{return!1}}function VB(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(n);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{e(s.error?.message||"")}}catch(t){e(t)}})}function Bp(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hD="FirebaseError";class Mt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=hD,Object.setPrototypeOf(this,Mt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Wr.prototype.create)}}class Wr{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},s=`${this.service}/${e}`,i=this.errors[e],o=i?dD(i,n):"Error",a=`${this.serviceName}: ${o} (${s}).`;return new Mt(s,a,n)}}function dD(r,e){try{let t=0,n="";for(;t<r.length;){const s=r.indexOf("{$",t);if(s===-1){n+=r.substring(t);break}const i=r.indexOf("}",s+2);if(i===-1){n+=r.substring(t);break}const o=r.substring(s+2,i),a=e[o];n+=r.substring(t,s)+(a!=null?String(a):`<${o}?>`),t=i+1}return n}catch{return r}}function fD(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function fn(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const s of t){if(!n.includes(s))return!1;const i=r[s],o=e[s];if(Dd(i)&&Dd(o)){if(!fn(i,o))return!1}else if(i!==o)return!1}for(const s of n)if(!t.includes(s))return!1;return!0}function Dd(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Do(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(s=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function vi(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[s,i]=n.split("=");e[decodeURIComponent(s)]=decodeURIComponent(i)}}),e}function Ri(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function CD(r,e){const t=new pD(r,e);return t.subscribe.bind(t)}class pD{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let s;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");gD(e,["next","error","complete"])?s=e:s={next:e,error:t,complete:n},s.next===void 0&&(s.next=Ec),s.error===void 0&&(s.error=Ec),s.complete===void 0&&(s.complete=Ec);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?s.error(this.finalError):s.complete()}catch{}}),this.observers.push(s),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function gD(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function Ec(){}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mD=1e3,ED=2,_D=4*60*60*1e3,DD=.5;function Id(r,e=mD,t=ED){const n=e*Math.pow(t,r),s=Math.round(DD*n*(Math.random()-.5)*2);return Math.min(_D,n+s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Te(r){return r&&r._delegate?r._delegate:r}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ks(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function kB(r){return(await fetch(r,{credentials:"include"})).ok}class Vt{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _r="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ID{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new op;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&n.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e?.identifier),n=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(s){if(n)return null;throw s}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(wD(e))try{this.getOrInitializeService({instanceIdentifier:_r})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:s});n.resolve(i)}catch{}}}}clearInstance(e=_r){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=_r){return this.instances.has(e)}getOptions(e=_r){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[i,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(i);n===a&&o.resolve(s)}return s}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),s=this.onInitCallbacks.get(n)??new Set;s.add(e),this.onInitCallbacks.set(n,s);const i=this.instances.get(n);return i&&e(i,n),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const s of n)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:yD(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=_r){return this.component?this.component.multipleInstances?e:_r:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function yD(r){return r===_r?void 0:r}function wD(r){return r.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class TD{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new ID(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Be;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(Be||(Be={}));const AD={debug:Be.DEBUG,verbose:Be.VERBOSE,info:Be.INFO,warn:Be.WARN,error:Be.ERROR,silent:Be.SILENT},vD=Be.INFO,RD={[Be.DEBUG]:"log",[Be.VERBOSE]:"log",[Be.INFO]:"info",[Be.WARN]:"warn",[Be.ERROR]:"error"},bD=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),s=RD[e];if(s)console[s](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class hu{constructor(e){this.name=e,this._logLevel=vD,this._logHandler=bD,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in Be))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?AD[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,Be.DEBUG,...e),this._logHandler(this,Be.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,Be.VERBOSE,...e),this._logHandler(this,Be.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,Be.INFO,...e),this._logHandler(this,Be.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,Be.WARN,...e),this._logHandler(this,Be.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,Be.ERROR,...e),this._logHandler(this,Be.ERROR,...e)}}const PD=(r,e)=>e.some(t=>r instanceof t);let yd,wd;function SD(){return yd||(yd=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function OD(){return wd||(wd=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const lp=new WeakMap,jc=new WeakMap,hp=new WeakMap,_c=new WeakMap,MB=new WeakMap;function ND(r){const e=new Promise((t,n)=>{const s=()=>{r.removeEventListener("success",i),r.removeEventListener("error",o)},i=()=>{t(Kn(r.result)),s()},o=()=>{n(r.error),s()};r.addEventListener("success",i),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&lp.set(t,r)}).catch(()=>{}),MB.set(e,r),e}function FD(r){if(jc.has(r))return;const e=new Promise((t,n)=>{const s=()=>{r.removeEventListener("complete",i),r.removeEventListener("error",o),r.removeEventListener("abort",o)},i=()=>{t(),s()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),s()};r.addEventListener("complete",i),r.addEventListener("error",o),r.addEventListener("abort",o)});jc.set(r,e)}let qc={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return jc.get(r);if(e==="objectStoreNames")return r.objectStoreNames||hp.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Kn(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function LD(r){qc=r(qc)}function xD(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(Dc(this),e,...t);return hp.set(n,e.sort?e.sort():[e]),Kn(n)}:OD().includes(r)?function(...e){return r.apply(Dc(this),e),Kn(lp.get(this))}:function(...e){return Kn(r.apply(Dc(this),e))}}function VD(r){return typeof r=="function"?xD(r):(r instanceof IDBTransaction&&FD(r),PD(r,SD())?new Proxy(r,qc):r)}function Kn(r){if(r instanceof IDBRequest)return ND(r);if(_c.has(r))return _c.get(r);const e=VD(r);return e!==r&&(_c.set(r,e),MB.set(e,r)),e}const Dc=r=>MB.get(r);function dp(r,e,{blocked:t,upgrade:n,blocking:s,terminated:i}={}){const o=indexedDB.open(r,e),a=Kn(o);return n&&o.addEventListener("upgradeneeded",c=>{n(Kn(o.result),c.oldVersion,c.newVersion,Kn(o.transaction),c)}),t&&o.addEventListener("blocked",c=>t(c.oldVersion,c.newVersion,c)),a.then(c=>{i&&c.addEventListener("close",()=>i()),s&&c.addEventListener("versionchange",B=>s(B.oldVersion,B.newVersion,B))}).catch(()=>{}),a}const kD=["get","getKey","getAll","getAllKeys","count"],MD=["put","add","delete","clear"],Ic=new Map;function Td(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(Ic.get(e))return Ic.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,s=MD.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(s||kD.includes(t)))return;const i=async function(o,...a){const c=this.transaction(o,s?"readwrite":"readonly");let B=c.store;return n&&(B=B.index(a.shift())),(await Promise.all([B[t](...a),s&&c.done]))[0]};return Ic.set(e,i),i}LD(r=>({...r,get:(e,t,n)=>Td(e,t)||r.get(e,t,n),has:(e,t)=>!!Td(e,t)||r.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class GD{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(UD(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function UD(r){return r.getComponent()?.type==="VERSION"}const Jc="@firebase/app",Ad="0.16.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cn=new hu("@firebase/app"),HD="@firebase/app-compat",jD="@firebase/analytics-compat",qD="@firebase/analytics",JD="@firebase/app-check-compat",KD="@firebase/app-check",zD="@firebase/auth",$D="@firebase/auth-compat",QD="@firebase/database",WD="@firebase/data-connect",YD="@firebase/database-compat",XD="@firebase/functions",ZD="@firebase/functions-compat",eI="@firebase/installations",tI="@firebase/installations-compat",nI="@firebase/messaging",rI="@firebase/messaging-compat",sI="@firebase/performance",iI="@firebase/performance-compat",oI="@firebase/remote-config",aI="@firebase/remote-config-compat",uI="@firebase/storage",cI="@firebase/storage-compat",BI="@firebase/firestore",lI="@firebase/ai",hI="@firebase/firestore-compat",dI="firebase",fI="12.18.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Kc="[DEFAULT]",CI={[Jc]:"fire-core",[HD]:"fire-core-compat",[qD]:"fire-analytics",[jD]:"fire-analytics-compat",[KD]:"fire-app-check",[JD]:"fire-app-check-compat",[zD]:"fire-auth",[$D]:"fire-auth-compat",[QD]:"fire-rtdb",[WD]:"fire-data-connect",[YD]:"fire-rtdb-compat",[XD]:"fire-fn",[ZD]:"fire-fn-compat",[eI]:"fire-iid",[tI]:"fire-iid-compat",[nI]:"fire-fcm",[rI]:"fire-fcm-compat",[sI]:"fire-perf",[iI]:"fire-perf-compat",[oI]:"fire-rc",[aI]:"fire-rc-compat",[uI]:"fire-gcs",[cI]:"fire-gcs-compat",[BI]:"fire-fst",[hI]:"fire-fst-compat",[lI]:"fire-vertex","fire-js":"fire-js",[dI]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oa=new Map,pI=new Map,zc=new Map;function vd(r,e){try{r.container.addComponent(e)}catch(t){Cn.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function nn(r){const e=r.name;if(zc.has(e))return Cn.debug(`There were multiple attempts to register component ${e}.`),!1;zc.set(e,r);for(const t of Oa.values())vd(t,r);for(const t of pI.values())vd(t,r);return!0}function Br(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function _t(r){return r==null?!1:r.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gI={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},cn=new Wr("app","Firebase",gI);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mI{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new Vt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw cn.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zs=fI;function EI(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:Kc,automaticDataCollectionEnabled:!0,...e},s=n.name;if(typeof s!="string"||!s)throw cn.create("bad-app-name",{appName:String(s)});if(t||(t=sp()),!t)throw cn.create("no-options");const i=Oa.get(s);if(i)if(fn(t,i.options)){if(fn(n,i.config))return i;throw cn.create("duplicate-app",{appName:s,mismatchedParam:"config",oldValue:JSON.stringify(i.config),newValue:JSON.stringify(n)})}else throw cn.create("duplicate-app",{appName:s,mismatchedParam:"options",oldValue:JSON.stringify(i.options),newValue:JSON.stringify(t)});const o=new TD(s);for(const c of zc.values())o.addComponent(c);const a=new mI(t,n,o);return Oa.set(s,a),a}function GB(r=Kc){const e=Oa.get(r);if(!e&&r===Kc&&sp())return EI();if(!e)throw cn.create("no-app",{appName:r});return e}function Ot(r,e,t){let n=CI[r]??r;t&&(n+=`-${t}`);const s=n.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const o=[`Unable to register library "${n}" with version "${e}":`];s&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),s&&i&&o.push("and"),i&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Cn.warn(o.join(" "));return}nn(new Vt(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _I="firebase-heartbeat-database",DI=1,Qi="firebase-heartbeat-store";let yc=null;function fp(){return yc||(yc=dp(_I,DI,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(Qi)}catch(t){console.warn(t)}}}}).catch(r=>{throw cn.create("idb-open",{originalErrorMessage:r.message})})),yc}async function II(r){try{const t=(await fp()).transaction(Qi),n=await t.objectStore(Qi).get(Cp(r));return await t.done,n}catch(e){if(e instanceof Mt)Cn.warn(e.message);else{const t=cn.create("idb-get",{originalErrorMessage:e?.message});Cn.warn(t.message)}}}async function Rd(r,e){try{const n=(await fp()).transaction(Qi,"readwrite");await n.objectStore(Qi).put(e,Cp(r)),await n.done}catch(t){if(t instanceof Mt)Cn.warn(t.message);else{const n=cn.create("idb-set",{originalErrorMessage:t?.message});Cn.warn(n.message)}}}function Cp(r){return`${r.name}!${r.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yI=1024,wI=30;class TI{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new vI(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){try{const t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),n=bd();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===n||this._heartbeatsCache.heartbeats.some(s=>s.date===n))return;if(this._heartbeatsCache.heartbeats.push({date:n,agent:t}),this._heartbeatsCache.heartbeats.length>wI){const s=RI(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){Cn.warn(e)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const e=bd(),{heartbeatsToSend:t,unsentEntries:n}=AI(this._heartbeatsCache.heartbeats),s=Sa(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,n.length>0?(this._heartbeatsCache.heartbeats=n,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(e){return Cn.warn(e),""}}}function bd(){return new Date().toISOString().substring(0,10)}function AI(r,e=yI){const t=[];let n=r.slice();for(const s of r){const i=t.find(o=>o.agent===s.agent);if(i){if(i.dates.push(s.date),Pd(t)>e){i.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),Pd(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class vI{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return lu()?VB().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await II(this.app);return t?.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Rd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Rd(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function Pd(r){return Sa(JSON.stringify({version:2,heartbeats:r})).length}function RI(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bI(r){nn(new Vt("platform-logger",e=>new GD(e),"PRIVATE")),nn(new Vt("heartbeat",e=>new TI(e),"PRIVATE")),Ot(Jc,Ad,r),Ot(Jc,Ad,"esm2020"),Ot("fire-js","")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */bI("");var PI="firebase",SI="12.18.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ot(PI,SI,"app");var Sd=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var zn,pp;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(y,m){function D(){}D.prototype=m.prototype,y.F=m.prototype,y.prototype=new D,y.prototype.constructor=y,y.D=function(v,w,P){for(var _=Array(arguments.length-2),Le=2;Le<arguments.length;Le++)_[Le-2]=arguments[Le];return m.prototype[w].apply(v,_)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(y,m,D){D||(D=0);const v=Array(16);if(typeof m=="string")for(var w=0;w<16;++w)v[w]=m.charCodeAt(D++)|m.charCodeAt(D++)<<8|m.charCodeAt(D++)<<16|m.charCodeAt(D++)<<24;else for(w=0;w<16;++w)v[w]=m[D++]|m[D++]<<8|m[D++]<<16|m[D++]<<24;m=y.g[0],D=y.g[1],w=y.g[2];let P=y.g[3],_;_=m+(P^D&(w^P))+v[0]+3614090360&4294967295,m=D+(_<<7&4294967295|_>>>25),_=P+(w^m&(D^w))+v[1]+3905402710&4294967295,P=m+(_<<12&4294967295|_>>>20),_=w+(D^P&(m^D))+v[2]+606105819&4294967295,w=P+(_<<17&4294967295|_>>>15),_=D+(m^w&(P^m))+v[3]+3250441966&4294967295,D=w+(_<<22&4294967295|_>>>10),_=m+(P^D&(w^P))+v[4]+4118548399&4294967295,m=D+(_<<7&4294967295|_>>>25),_=P+(w^m&(D^w))+v[5]+1200080426&4294967295,P=m+(_<<12&4294967295|_>>>20),_=w+(D^P&(m^D))+v[6]+2821735955&4294967295,w=P+(_<<17&4294967295|_>>>15),_=D+(m^w&(P^m))+v[7]+4249261313&4294967295,D=w+(_<<22&4294967295|_>>>10),_=m+(P^D&(w^P))+v[8]+1770035416&4294967295,m=D+(_<<7&4294967295|_>>>25),_=P+(w^m&(D^w))+v[9]+2336552879&4294967295,P=m+(_<<12&4294967295|_>>>20),_=w+(D^P&(m^D))+v[10]+4294925233&4294967295,w=P+(_<<17&4294967295|_>>>15),_=D+(m^w&(P^m))+v[11]+2304563134&4294967295,D=w+(_<<22&4294967295|_>>>10),_=m+(P^D&(w^P))+v[12]+1804603682&4294967295,m=D+(_<<7&4294967295|_>>>25),_=P+(w^m&(D^w))+v[13]+4254626195&4294967295,P=m+(_<<12&4294967295|_>>>20),_=w+(D^P&(m^D))+v[14]+2792965006&4294967295,w=P+(_<<17&4294967295|_>>>15),_=D+(m^w&(P^m))+v[15]+1236535329&4294967295,D=w+(_<<22&4294967295|_>>>10),_=m+(w^P&(D^w))+v[1]+4129170786&4294967295,m=D+(_<<5&4294967295|_>>>27),_=P+(D^w&(m^D))+v[6]+3225465664&4294967295,P=m+(_<<9&4294967295|_>>>23),_=w+(m^D&(P^m))+v[11]+643717713&4294967295,w=P+(_<<14&4294967295|_>>>18),_=D+(P^m&(w^P))+v[0]+3921069994&4294967295,D=w+(_<<20&4294967295|_>>>12),_=m+(w^P&(D^w))+v[5]+3593408605&4294967295,m=D+(_<<5&4294967295|_>>>27),_=P+(D^w&(m^D))+v[10]+38016083&4294967295,P=m+(_<<9&4294967295|_>>>23),_=w+(m^D&(P^m))+v[15]+3634488961&4294967295,w=P+(_<<14&4294967295|_>>>18),_=D+(P^m&(w^P))+v[4]+3889429448&4294967295,D=w+(_<<20&4294967295|_>>>12),_=m+(w^P&(D^w))+v[9]+568446438&4294967295,m=D+(_<<5&4294967295|_>>>27),_=P+(D^w&(m^D))+v[14]+3275163606&4294967295,P=m+(_<<9&4294967295|_>>>23),_=w+(m^D&(P^m))+v[3]+4107603335&4294967295,w=P+(_<<14&4294967295|_>>>18),_=D+(P^m&(w^P))+v[8]+1163531501&4294967295,D=w+(_<<20&4294967295|_>>>12),_=m+(w^P&(D^w))+v[13]+2850285829&4294967295,m=D+(_<<5&4294967295|_>>>27),_=P+(D^w&(m^D))+v[2]+4243563512&4294967295,P=m+(_<<9&4294967295|_>>>23),_=w+(m^D&(P^m))+v[7]+1735328473&4294967295,w=P+(_<<14&4294967295|_>>>18),_=D+(P^m&(w^P))+v[12]+2368359562&4294967295,D=w+(_<<20&4294967295|_>>>12),_=m+(D^w^P)+v[5]+4294588738&4294967295,m=D+(_<<4&4294967295|_>>>28),_=P+(m^D^w)+v[8]+2272392833&4294967295,P=m+(_<<11&4294967295|_>>>21),_=w+(P^m^D)+v[11]+1839030562&4294967295,w=P+(_<<16&4294967295|_>>>16),_=D+(w^P^m)+v[14]+4259657740&4294967295,D=w+(_<<23&4294967295|_>>>9),_=m+(D^w^P)+v[1]+2763975236&4294967295,m=D+(_<<4&4294967295|_>>>28),_=P+(m^D^w)+v[4]+1272893353&4294967295,P=m+(_<<11&4294967295|_>>>21),_=w+(P^m^D)+v[7]+4139469664&4294967295,w=P+(_<<16&4294967295|_>>>16),_=D+(w^P^m)+v[10]+3200236656&4294967295,D=w+(_<<23&4294967295|_>>>9),_=m+(D^w^P)+v[13]+681279174&4294967295,m=D+(_<<4&4294967295|_>>>28),_=P+(m^D^w)+v[0]+3936430074&4294967295,P=m+(_<<11&4294967295|_>>>21),_=w+(P^m^D)+v[3]+3572445317&4294967295,w=P+(_<<16&4294967295|_>>>16),_=D+(w^P^m)+v[6]+76029189&4294967295,D=w+(_<<23&4294967295|_>>>9),_=m+(D^w^P)+v[9]+3654602809&4294967295,m=D+(_<<4&4294967295|_>>>28),_=P+(m^D^w)+v[12]+3873151461&4294967295,P=m+(_<<11&4294967295|_>>>21),_=w+(P^m^D)+v[15]+530742520&4294967295,w=P+(_<<16&4294967295|_>>>16),_=D+(w^P^m)+v[2]+3299628645&4294967295,D=w+(_<<23&4294967295|_>>>9),_=m+(w^(D|~P))+v[0]+4096336452&4294967295,m=D+(_<<6&4294967295|_>>>26),_=P+(D^(m|~w))+v[7]+1126891415&4294967295,P=m+(_<<10&4294967295|_>>>22),_=w+(m^(P|~D))+v[14]+2878612391&4294967295,w=P+(_<<15&4294967295|_>>>17),_=D+(P^(w|~m))+v[5]+4237533241&4294967295,D=w+(_<<21&4294967295|_>>>11),_=m+(w^(D|~P))+v[12]+1700485571&4294967295,m=D+(_<<6&4294967295|_>>>26),_=P+(D^(m|~w))+v[3]+2399980690&4294967295,P=m+(_<<10&4294967295|_>>>22),_=w+(m^(P|~D))+v[10]+4293915773&4294967295,w=P+(_<<15&4294967295|_>>>17),_=D+(P^(w|~m))+v[1]+2240044497&4294967295,D=w+(_<<21&4294967295|_>>>11),_=m+(w^(D|~P))+v[8]+1873313359&4294967295,m=D+(_<<6&4294967295|_>>>26),_=P+(D^(m|~w))+v[15]+4264355552&4294967295,P=m+(_<<10&4294967295|_>>>22),_=w+(m^(P|~D))+v[6]+2734768916&4294967295,w=P+(_<<15&4294967295|_>>>17),_=D+(P^(w|~m))+v[13]+1309151649&4294967295,D=w+(_<<21&4294967295|_>>>11),_=m+(w^(D|~P))+v[4]+4149444226&4294967295,m=D+(_<<6&4294967295|_>>>26),_=P+(D^(m|~w))+v[11]+3174756917&4294967295,P=m+(_<<10&4294967295|_>>>22),_=w+(m^(P|~D))+v[2]+718787259&4294967295,w=P+(_<<15&4294967295|_>>>17),_=D+(P^(w|~m))+v[9]+3951481745&4294967295,y.g[0]=y.g[0]+m&4294967295,y.g[1]=y.g[1]+(w+(_<<21&4294967295|_>>>11))&4294967295,y.g[2]=y.g[2]+w&4294967295,y.g[3]=y.g[3]+P&4294967295}n.prototype.v=function(y,m){m===void 0&&(m=y.length);const D=m-this.blockSize,v=this.C;let w=this.h,P=0;for(;P<m;){if(w==0)for(;P<=D;)s(this,y,P),P+=this.blockSize;if(typeof y=="string"){for(;P<m;)if(v[w++]=y.charCodeAt(P++),w==this.blockSize){s(this,v),w=0;break}}else for(;P<m;)if(v[w++]=y[P++],w==this.blockSize){s(this,v),w=0;break}}this.h=w,this.o+=m},n.prototype.A=function(){var y=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);y[0]=128;for(var m=1;m<y.length-8;++m)y[m]=0;m=this.o*8;for(var D=y.length-8;D<y.length;++D)y[D]=m&255,m/=256;for(this.v(y),y=Array(16),m=0,D=0;D<4;++D)for(let v=0;v<32;v+=8)y[m++]=this.g[D]>>>v&255;return y};function i(y,m){var D=a;return Object.prototype.hasOwnProperty.call(D,y)?D[y]:D[y]=m(y)}function o(y,m){this.h=m;const D=[];let v=!0;for(let w=y.length-1;w>=0;w--){const P=y[w]|0;v&&P==m||(D[w]=P,v=!1)}this.g=D}var a={};function c(y){return-128<=y&&y<128?i(y,function(m){return new o([m|0],m<0?-1:0)}):new o([y|0],y<0?-1:0)}function B(y){if(isNaN(y)||!isFinite(y))return d;if(y<0)return M(B(-y));const m=[];let D=1;for(let v=0;y>=D;v++)m[v]=y/D|0,D*=4294967296;return new o(m,0)}function h(y,m){if(y.length==0)throw Error("number format error: empty string");if(m=m||10,m<2||36<m)throw Error("radix out of range: "+m);if(y.charAt(0)=="-")return M(h(y.substring(1),m));if(y.indexOf("-")>=0)throw Error('number format error: interior "-" character');const D=B(Math.pow(m,8));let v=d;for(let P=0;P<y.length;P+=8){var w=Math.min(8,y.length-P);const _=parseInt(y.substring(P,P+w),m);w<8?(w=B(Math.pow(m,w)),v=v.j(w).add(B(_))):(v=v.j(D),v=v.add(B(_)))}return v}var d=c(0),C=c(1),I=c(16777216);r=o.prototype,r.m=function(){if(N(this))return-M(this).m();let y=0,m=1;for(let D=0;D<this.g.length;D++){const v=this.i(D);y+=(v>=0?v:4294967296+v)*m,m*=4294967296}return y},r.toString=function(y){if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(R(this))return"0";if(N(this))return"-"+M(this).toString(y);const m=B(Math.pow(y,6));var D=this;let v="";for(;;){const w=ce(D,m).g;D=K(D,w.j(m));let P=((D.g.length>0?D.g[0]:D.h)>>>0).toString(y);if(D=w,R(D))return P+v;for(;P.length<6;)P="0"+P;v=P+v}},r.i=function(y){return y<0?0:y<this.g.length?this.g[y]:this.h};function R(y){if(y.h!=0)return!1;for(let m=0;m<y.g.length;m++)if(y.g[m]!=0)return!1;return!0}function N(y){return y.h==-1}r.l=function(y){return y=K(this,y),N(y)?-1:R(y)?0:1};function M(y){const m=y.g.length,D=[];for(let v=0;v<m;v++)D[v]=~y.g[v];return new o(D,~y.h).add(C)}r.abs=function(){return N(this)?M(this):this},r.add=function(y){const m=Math.max(this.g.length,y.g.length),D=[];let v=0;for(let w=0;w<=m;w++){let P=v+(this.i(w)&65535)+(y.i(w)&65535),_=(P>>>16)+(this.i(w)>>>16)+(y.i(w)>>>16);v=_>>>16,P&=65535,_&=65535,D[w]=_<<16|P}return new o(D,D[D.length-1]&-2147483648?-1:0)};function K(y,m){return y.add(M(m))}r.j=function(y){if(R(this)||R(y))return d;if(N(this))return N(y)?M(this).j(M(y)):M(M(this).j(y));if(N(y))return M(this.j(M(y)));if(this.l(I)<0&&y.l(I)<0)return B(this.m()*y.m());const m=this.g.length+y.g.length,D=[];for(var v=0;v<2*m;v++)D[v]=0;for(v=0;v<this.g.length;v++)for(let w=0;w<y.g.length;w++){const P=this.i(v)>>>16,_=this.i(v)&65535,Le=y.i(w)>>>16,vt=y.i(w)&65535;D[2*v+2*w]+=_*vt,Z(D,2*v+2*w),D[2*v+2*w+1]+=P*vt,Z(D,2*v+2*w+1),D[2*v+2*w+1]+=_*Le,Z(D,2*v+2*w+1),D[2*v+2*w+2]+=P*Le,Z(D,2*v+2*w+2)}for(y=0;y<m;y++)D[y]=D[2*y+1]<<16|D[2*y];for(y=m;y<2*m;y++)D[y]=0;return new o(D,0)};function Z(y,m){for(;(y[m]&65535)!=y[m];)y[m+1]+=y[m]>>>16,y[m]&=65535,m++}function te(y,m){this.g=y,this.h=m}function ce(y,m){if(R(m))throw Error("division by zero");if(R(y))return new te(d,d);if(N(y))return m=ce(M(y),m),new te(M(m.g),M(m.h));if(N(m))return m=ce(y,M(m)),new te(M(m.g),m.h);if(y.g.length>30){if(N(y)||N(m))throw Error("slowDivide_ only works with positive integers.");for(var D=C,v=m;v.l(y)<=0;)D=fe(D),v=fe(v);var w=oe(D,1),P=oe(v,1);for(v=oe(v,2),D=oe(D,2);!R(v);){var _=P.add(v);_.l(y)<=0&&(w=w.add(D),P=_),v=oe(v,1),D=oe(D,1)}return m=K(y,w.j(m)),new te(w,m)}for(w=d;y.l(m)>=0;){for(D=Math.max(1,Math.floor(y.m()/m.m())),v=Math.ceil(Math.log(D)/Math.LN2),v=v<=48?1:Math.pow(2,v-48),P=B(D),_=P.j(m);N(_)||_.l(y)>0;)D-=v,P=B(D),_=P.j(m);R(P)&&(P=C),w=w.add(P),y=K(y,_)}return new te(w,y)}r.B=function(y){return ce(this,y).h},r.and=function(y){const m=Math.max(this.g.length,y.g.length),D=[];for(let v=0;v<m;v++)D[v]=this.i(v)&y.i(v);return new o(D,this.h&y.h)},r.or=function(y){const m=Math.max(this.g.length,y.g.length),D=[];for(let v=0;v<m;v++)D[v]=this.i(v)|y.i(v);return new o(D,this.h|y.h)},r.xor=function(y){const m=Math.max(this.g.length,y.g.length),D=[];for(let v=0;v<m;v++)D[v]=this.i(v)^y.i(v);return new o(D,this.h^y.h)};function fe(y){const m=y.g.length+1,D=[];for(let v=0;v<m;v++)D[v]=y.i(v)<<1|y.i(v-1)>>>31;return new o(D,y.h)}function oe(y,m){const D=m>>5;m%=32;const v=y.g.length-D,w=[];for(let P=0;P<v;P++)w[P]=m>0?y.i(P+D)>>>m|y.i(P+D+1)<<32-m:y.i(P+D);return new o(w,y.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,pp=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=B,o.fromString=h,zn=o}).apply(typeof Sd<"u"?Sd:typeof self<"u"?self:typeof window<"u"?window:{});var ea=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var gp,bi,mp,Ca,$c,Ep,_p,Dp;(function(){var r,e=Object.defineProperty;function t(u){u=[typeof globalThis=="object"&&globalThis,u,typeof window=="object"&&window,typeof self=="object"&&self,typeof ea=="object"&&ea];for(var l=0;l<u.length;++l){var f=u[l];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var n=t(this);function s(u,l){if(l)e:{var f=n;u=u.split(".");for(var p=0;p<u.length-1;p++){var S=u[p];if(!(S in f))break e;f=f[S]}u=u[u.length-1],p=f[u],l=l(p),l!=p&&l!=null&&e(f,u,{configurable:!0,writable:!0,value:l})}}s("Symbol.dispose",function(u){return u||Symbol("Symbol.dispose")}),s("Array.prototype.values",function(u){return u||function(){return this[Symbol.iterator]()}}),s("Object.entries",function(u){return u||function(l){var f=[],p;for(p in l)Object.prototype.hasOwnProperty.call(l,p)&&f.push([p,l[p]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},o=this||self;function a(u){var l=typeof u;return l=="object"&&u!=null||l=="function"}function c(u,l,f){return u.call.apply(u.bind,arguments)}function B(u,l,f){return B=c,B.apply(null,arguments)}function h(u,l){var f=Array.prototype.slice.call(arguments,1);return function(){var p=f.slice();return p.push.apply(p,arguments),u.apply(this,p)}}function d(u,l){function f(){}f.prototype=l.prototype,u.Z=l.prototype,u.prototype=new f,u.prototype.constructor=u,u.Ob=function(p,S,O){for(var J=Array(arguments.length-2),ae=2;ae<arguments.length;ae++)J[ae-2]=arguments[ae];return l.prototype[S].apply(p,J)}}var C=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?u=>u&&AsyncContext.Snapshot.wrap(u):u=>u;function I(u){const l=u.length;if(l>0){const f=Array(l);for(let p=0;p<l;p++)f[p]=u[p];return f}return[]}function R(u,l){for(let p=1;p<arguments.length;p++){const S=arguments[p];var f=typeof S;if(f=f!="object"?f:S?Array.isArray(S)?"array":f:"null",f=="array"||f=="object"&&typeof S.length=="number"){f=u.length||0;const O=S.length||0;u.length=f+O;for(let J=0;J<O;J++)u[f+J]=S[J]}else u.push(S)}}class N{constructor(l,f){this.i=l,this.j=f,this.h=0,this.g=null}get(){let l;return this.h>0?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function M(u){o.setTimeout(()=>{throw u},0)}function K(){var u=y;let l=null;return u.g&&(l=u.g,u.g=u.g.next,u.g||(u.h=null),l.next=null),l}class Z{constructor(){this.h=this.g=null}add(l,f){const p=te.get();p.set(l,f),this.h?this.h.next=p:this.g=p,this.h=p}}var te=new N(()=>new ce,u=>u.reset());class ce{constructor(){this.next=this.g=this.h=null}set(l,f){this.h=l,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let fe,oe=!1,y=new Z,m=()=>{const u=Promise.resolve(void 0);fe=()=>{u.then(D)}};function D(){for(var u;u=K();){try{u.h.call(u.g)}catch(f){M(f)}var l=te;l.j(u),l.h<100&&(l.h++,u.next=l.g,l.g=u)}oe=!1}function v(){this.u=this.u,this.C=this.C}v.prototype.u=!1,v.prototype.dispose=function(){this.u||(this.u=!0,this.N())},v.prototype[Symbol.dispose]=function(){this.dispose()},v.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function w(u,l){this.type=u,this.g=this.target=l,this.defaultPrevented=!1}w.prototype.h=function(){this.defaultPrevented=!0};var P=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var u=!1,l=Object.defineProperty({},"passive",{get:function(){u=!0}});try{const f=()=>{};o.addEventListener("test",f,l),o.removeEventListener("test",f,l)}catch{}return u}();function _(u){return/^[\s\xa0]*$/.test(u)}function Le(u,l){w.call(this,u?u.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,u&&this.init(u,l)}d(Le,w),Le.prototype.init=function(u,l){const f=this.type=u.type,p=u.changedTouches&&u.changedTouches.length?u.changedTouches[0]:null;this.target=u.target||u.srcElement,this.g=l,l=u.relatedTarget,l||(f=="mouseover"?l=u.fromElement:f=="mouseout"&&(l=u.toElement)),this.relatedTarget=l,p?(this.clientX=p.clientX!==void 0?p.clientX:p.pageX,this.clientY=p.clientY!==void 0?p.clientY:p.pageY,this.screenX=p.screenX||0,this.screenY=p.screenY||0):(this.clientX=u.clientX!==void 0?u.clientX:u.pageX,this.clientY=u.clientY!==void 0?u.clientY:u.pageY,this.screenX=u.screenX||0,this.screenY=u.screenY||0),this.button=u.button,this.key=u.key||"",this.ctrlKey=u.ctrlKey,this.altKey=u.altKey,this.shiftKey=u.shiftKey,this.metaKey=u.metaKey,this.pointerId=u.pointerId||0,this.pointerType=u.pointerType,this.state=u.state,this.i=u,u.defaultPrevented&&Le.Z.h.call(this)},Le.prototype.h=function(){Le.Z.h.call(this);const u=this.i;u.preventDefault?u.preventDefault():u.returnValue=!1};var vt="closure_listenable_"+(Math.random()*1e6|0),c_=0;function B_(u,l,f,p,S){this.listener=u,this.proxy=null,this.src=l,this.type=f,this.capture=!!p,this.ha=S,this.key=++c_,this.da=this.fa=!1}function Mo(u){u.da=!0,u.listener=null,u.proxy=null,u.src=null,u.ha=null}function Go(u,l,f){for(const p in u)l.call(f,u[p],p,u)}function l_(u,l){for(const f in u)l.call(void 0,u[f],f,u)}function fh(u){const l={};for(const f in u)l[f]=u[f];return l}const Ch="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function ph(u,l){let f,p;for(let S=1;S<arguments.length;S++){p=arguments[S];for(f in p)u[f]=p[f];for(let O=0;O<Ch.length;O++)f=Ch[O],Object.prototype.hasOwnProperty.call(p,f)&&(u[f]=p[f])}}function Uo(u){this.src=u,this.g={},this.h=0}Uo.prototype.add=function(u,l,f,p,S){const O=u.toString();u=this.g[O],u||(u=this.g[O]=[],this.h++);const J=Qu(u,l,p,S);return J>-1?(l=u[J],f||(l.fa=!1)):(l=new B_(l,this.src,O,!!p,S),l.fa=f,u.push(l)),l};function $u(u,l){const f=l.type;if(f in u.g){var p=u.g[f],S=Array.prototype.indexOf.call(p,l,void 0),O;(O=S>=0)&&Array.prototype.splice.call(p,S,1),O&&(Mo(l),u.g[f].length==0&&(delete u.g[f],u.h--))}}function Qu(u,l,f,p){for(let S=0;S<u.length;++S){const O=u[S];if(!O.da&&O.listener==l&&O.capture==!!f&&O.ha==p)return S}return-1}var Wu="closure_lm_"+(Math.random()*1e6|0),Yu={};function gh(u,l,f,p,S){if(Array.isArray(l)){for(let O=0;O<l.length;O++)gh(u,l[O],f,p,S);return null}return f=_h(f),u&&u[vt]?u.J(l,f,a(p)?!!p.capture:!1,S):h_(u,l,f,!1,p,S)}function h_(u,l,f,p,S,O){if(!l)throw Error("Invalid event type");const J=a(S)?!!S.capture:!!S;let ae=Zu(u);if(ae||(u[Wu]=ae=new Uo(u)),f=ae.add(l,f,p,J,O),f.proxy)return f;if(p=d_(),f.proxy=p,p.src=u,p.listener=f,u.addEventListener)P||(S=J),S===void 0&&(S=!1),u.addEventListener(l.toString(),p,S);else if(u.attachEvent)u.attachEvent(Eh(l.toString()),p);else if(u.addListener&&u.removeListener)u.addListener(p);else throw Error("addEventListener and attachEvent are unavailable.");return f}function d_(){function u(f){return l.call(u.src,u.listener,f)}const l=f_;return u}function mh(u,l,f,p,S){if(Array.isArray(l))for(var O=0;O<l.length;O++)mh(u,l[O],f,p,S);else p=a(p)?!!p.capture:!!p,f=_h(f),u&&u[vt]?(u=u.i,O=String(l).toString(),O in u.g&&(l=u.g[O],f=Qu(l,f,p,S),f>-1&&(Mo(l[f]),Array.prototype.splice.call(l,f,1),l.length==0&&(delete u.g[O],u.h--)))):u&&(u=Zu(u))&&(l=u.g[l.toString()],u=-1,l&&(u=Qu(l,f,p,S)),(f=u>-1?l[u]:null)&&Xu(f))}function Xu(u){if(typeof u!="number"&&u&&!u.da){var l=u.src;if(l&&l[vt])$u(l.i,u);else{var f=u.type,p=u.proxy;l.removeEventListener?l.removeEventListener(f,p,u.capture):l.detachEvent?l.detachEvent(Eh(f),p):l.addListener&&l.removeListener&&l.removeListener(p),(f=Zu(l))?($u(f,u),f.h==0&&(f.src=null,l[Wu]=null)):Mo(u)}}}function Eh(u){return u in Yu?Yu[u]:Yu[u]="on"+u}function f_(u,l){if(u.da)u=!0;else{l=new Le(l,this);const f=u.listener,p=u.ha||u.src;u.fa&&Xu(u),u=f.call(p,l)}return u}function Zu(u){return u=u[Wu],u instanceof Uo?u:null}var ec="__closure_events_fn_"+(Math.random()*1e9>>>0);function _h(u){return typeof u=="function"?u:(u[ec]||(u[ec]=function(l){return u.handleEvent(l)}),u[ec])}function We(){v.call(this),this.i=new Uo(this),this.M=this,this.G=null}d(We,v),We.prototype[vt]=!0,We.prototype.removeEventListener=function(u,l,f,p){mh(this,u,l,f,p)};function rt(u,l){var f,p=u.G;if(p)for(f=[];p;p=p.G)f.push(p);if(u=u.M,p=l.type||l,typeof l=="string")l=new w(l,u);else if(l instanceof w)l.target=l.target||u;else{var S=l;l=new w(p,u),ph(l,S)}S=!0;let O,J;if(f)for(J=f.length-1;J>=0;J--)O=l.g=f[J],S=Ho(O,p,!0,l)&&S;if(O=l.g=u,S=Ho(O,p,!0,l)&&S,S=Ho(O,p,!1,l)&&S,f)for(J=0;J<f.length;J++)O=l.g=f[J],S=Ho(O,p,!1,l)&&S}We.prototype.N=function(){if(We.Z.N.call(this),this.i){var u=this.i;for(const l in u.g){const f=u.g[l];for(let p=0;p<f.length;p++)Mo(f[p]);delete u.g[l],u.h--}}this.G=null},We.prototype.J=function(u,l,f,p){return this.i.add(String(u),l,!1,f,p)},We.prototype.K=function(u,l,f,p){return this.i.add(String(u),l,!0,f,p)};function Ho(u,l,f,p){if(l=u.i.g[String(l)],!l)return!0;l=l.concat();let S=!0;for(let O=0;O<l.length;++O){const J=l[O];if(J&&!J.da&&J.capture==f){const ae=J.listener,xe=J.ha||J.src;J.fa&&$u(u.i,J),S=ae.call(xe,p)!==!1&&S}}return S&&!p.defaultPrevented}function C_(u,l){if(typeof u!="function")if(u&&typeof u.handleEvent=="function")u=B(u.handleEvent,u);else throw Error("Invalid listener argument");return Number(l)>2147483647?-1:o.setTimeout(u,l||0)}function Dh(u){u.g=C_(()=>{u.g=null,u.i&&(u.i=!1,Dh(u))},u.l);const l=u.h;u.h=null,u.m.apply(null,l)}class p_ extends v{constructor(l,f){super(),this.m=l,this.l=f,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:Dh(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function si(u){v.call(this),this.h=u,this.g={}}d(si,v);var Ih=[];function yh(u){Go(u.g,function(l,f){this.g.hasOwnProperty(f)&&Xu(l)},u),u.g={}}si.prototype.N=function(){si.Z.N.call(this),yh(this)},si.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var tc=o.JSON.stringify,g_=o.JSON.parse,m_=class{stringify(u){return o.JSON.stringify(u,void 0)}parse(u){return o.JSON.parse(u,void 0)}};function wh(){}function Th(){}var ii={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function nc(){w.call(this,"d")}d(nc,w);function rc(){w.call(this,"c")}d(rc,w);var Cr={},Ah=null;function jo(){return Ah=Ah||new We}Cr.Ia="serverreachability";function vh(u){w.call(this,Cr.Ia,u)}d(vh,w);function oi(u){const l=jo();rt(l,new vh(l))}Cr.STAT_EVENT="statevent";function Rh(u,l){w.call(this,Cr.STAT_EVENT,u),this.stat=l}d(Rh,w);function st(u){const l=jo();rt(l,new Rh(l,u))}Cr.Ja="timingevent";function bh(u,l){w.call(this,Cr.Ja,u),this.size=l}d(bh,w);function ai(u,l){if(typeof u!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){u()},l)}function ui(){this.g=!0}ui.prototype.ua=function(){this.g=!1};function E_(u,l,f,p,S,O){u.info(function(){if(u.g)if(O){var J="",ae=O.split("&");for(let Ee=0;Ee<ae.length;Ee++){var xe=ae[Ee].split("=");if(xe.length>1){const Ue=xe[0];xe=xe[1];const Ut=Ue.split("_");J=Ut.length>=2&&Ut[1]=="type"?J+(Ue+"="+xe+"&"):J+(Ue+"=redacted&")}}}else J=null;else J=O;return"XMLHTTP REQ ("+p+") [attempt "+S+"]: "+l+`
`+f+`
`+J})}function __(u,l,f,p,S,O,J){u.info(function(){return"XMLHTTP RESP ("+p+") [ attempt "+S+"]: "+l+`
`+f+`
`+O+" "+J})}function ns(u,l,f,p){u.info(function(){return"XMLHTTP TEXT ("+l+"): "+I_(u,f)+(p?" "+p:"")})}function D_(u,l){u.info(function(){return"TIMEOUT: "+l})}ui.prototype.info=function(){};function I_(u,l){if(!u.g)return l;if(!l)return null;try{const O=JSON.parse(l);if(O){for(u=0;u<O.length;u++)if(Array.isArray(O[u])){var f=O[u];if(!(f.length<2)){var p=f[1];if(Array.isArray(p)&&!(p.length<1)){var S=p[0];if(S!="noop"&&S!="stop"&&S!="close")for(let J=1;J<p.length;J++)p[J]=""}}}}return tc(O)}catch{return l}}var qo={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Ph={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Sh;function sc(){}d(sc,wh),sc.prototype.g=function(){return new XMLHttpRequest},Sh=new sc;function ci(u){return encodeURIComponent(String(u))}function y_(u){var l=1;u=u.split(":");const f=[];for(;l>0&&u.length;)f.push(u.shift()),l--;return u.length&&f.push(u.join(":")),f}function Tn(u,l,f,p){this.j=u,this.i=l,this.l=f,this.S=p||1,this.V=new si(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Oh}function Oh(){this.i=null,this.g="",this.h=!1}var Nh={},ic={};function oc(u,l,f){u.M=1,u.A=Ko(Gt(l)),u.u=f,u.R=!0,Fh(u,null)}function Fh(u,l){u.F=Date.now(),Jo(u),u.B=Gt(u.A);var f=u.B,p=u.S;Array.isArray(p)||(p=[String(p)]),zh(f.i,"t",p),u.C=0,f=u.j.L,u.h=new Oh,u.g=ld(u.j,f?l:null,!u.u),u.P>0&&(u.O=new p_(B(u.Y,u,u.g),u.P)),l=u.V,f=u.g,p=u.ba;var S="readystatechange";Array.isArray(S)||(S&&(Ih[0]=S.toString()),S=Ih);for(let O=0;O<S.length;O++){const J=gh(f,S[O],p||l.handleEvent,!1,l.h||l);if(!J)break;l.g[J.key]=J}l=u.J?fh(u.J):{},u.u?(u.v||(u.v="POST"),l["Content-Type"]="application/x-www-form-urlencoded",u.g.ea(u.B,u.v,u.u,l)):(u.v="GET",u.g.ea(u.B,u.v,null,l)),oi(),E_(u.i,u.v,u.B,u.l,u.S,u.u)}Tn.prototype.ba=function(u){u=u.target;const l=this.O;l&&Rn(u)==3?l.j():this.Y(u)},Tn.prototype.Y=function(u){try{if(u==this.g)e:{const ae=Rn(this.g),xe=this.g.ya(),Ee=this.g.ca();if(!(ae<3)&&(ae!=3||this.g&&(this.h.h||this.g.la()||ed(this.g)))){this.K||ae!=4||xe==7||(xe==8||Ee<=0?oi(3):oi(2)),ac(this);var l=this.g.ca();this.X=l;var f=w_(this);if(this.o=l==200,__(this.i,this.v,this.B,this.l,this.S,ae,l),this.o){if(this.U&&!this.L){t:{if(this.g){var p,S=this.g;if((p=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!_(p)){var O=p;break t}}O=null}if(u=O)ns(this.i,this.l,u,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,uc(this,u);else{this.o=!1,this.m=3,st(12),pr(this),Bi(this);break e}}if(this.R){u=!0;let Ue;for(;!this.K&&this.C<f.length;)if(Ue=T_(this,f),Ue==ic){ae==4&&(this.m=4,st(14),u=!1),ns(this.i,this.l,null,"[Incomplete Response]");break}else if(Ue==Nh){this.m=4,st(15),ns(this.i,this.l,f,"[Invalid Chunk]"),u=!1;break}else ns(this.i,this.l,Ue,null),uc(this,Ue);if(Lh(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),ae!=4||f.length!=0||this.h.h||(this.m=1,st(16),u=!1),this.o=this.o&&u,!u)ns(this.i,this.l,f,"[Invalid Chunked Response]"),pr(this),Bi(this);else if(f.length>0&&!this.W){this.W=!0;var J=this.j;J.g==this&&J.aa&&!J.P&&(J.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),pc(J),J.P=!0,st(11))}}else ns(this.i,this.l,f,null),uc(this,f);ae==4&&pr(this),this.o&&!this.K&&(ae==4?ad(this.j,this):(this.o=!1,Jo(this)))}else M_(this.g),l==400&&f.indexOf("Unknown SID")>0?(this.m=3,st(12)):(this.m=0,st(13)),pr(this),Bi(this)}}}catch{}finally{}};function w_(u){if(!Lh(u))return u.g.la();const l=ed(u.g);if(l==="")return"";let f="";const p=l.length,S=Rn(u.g)==4;if(!u.h.i){if(typeof TextDecoder>"u")return pr(u),Bi(u),"";u.h.i=new o.TextDecoder}for(let O=0;O<p;O++)u.h.h=!0,f+=u.h.i.decode(l[O],{stream:!(S&&O==p-1)});return l.length=0,u.h.g+=f,u.C=0,u.h.g}function Lh(u){return u.g?u.v=="GET"&&u.M!=2&&u.j.Aa:!1}function T_(u,l){var f=u.C,p=l.indexOf(`
`,f);return p==-1?ic:(f=Number(l.substring(f,p)),isNaN(f)?Nh:(p+=1,p+f>l.length?ic:(l=l.slice(p,p+f),u.C=p+f,l)))}Tn.prototype.cancel=function(){this.K=!0,pr(this)};function Jo(u){u.T=Date.now()+u.H,xh(u,u.H)}function xh(u,l){if(u.D!=null)throw Error("WatchDog timer not null");u.D=ai(B(u.aa,u),l)}function ac(u){u.D&&(o.clearTimeout(u.D),u.D=null)}Tn.prototype.aa=function(){this.D=null;const u=Date.now();u-this.T>=0?(D_(this.i,this.B),this.M!=2&&(oi(),st(17)),pr(this),this.m=2,Bi(this)):xh(this,this.T-u)};function Bi(u){u.j.I==0||u.K||ad(u.j,u)}function pr(u){ac(u);var l=u.O;l&&typeof l.dispose=="function"&&l.dispose(),u.O=null,yh(u.V),u.g&&(l=u.g,u.g=null,l.abort(),l.dispose())}function uc(u,l){try{var f=u.j;if(f.I!=0&&(f.g==u||cc(f.h,u))){if(!u.L&&cc(f.h,u)&&f.I==3){try{var p=f.Ba.g.parse(l)}catch{p=null}if(Array.isArray(p)&&p.length==3){var S=p;if(S[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<u.F)Yo(f),Qo(f);else break e;Cc(f),st(18)}}else f.xa=S[1],0<f.xa-f.K&&S[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=ai(B(f.Va,f),6e3));Mh(f.h)<=1&&f.ta&&(f.ta=void 0)}else mr(f,11)}else if((u.L||f.g==u)&&Yo(f),!_(l))for(S=f.Ba.g.parse(l),l=0;l<S.length;l++){let Ee=S[l];const Ue=Ee[0];if(!(Ue<=f.K))if(f.K=Ue,Ee=Ee[1],f.I==2)if(Ee[0]=="c"){f.M=Ee[1],f.ba=Ee[2];const Ut=Ee[3];Ut!=null&&(f.ka=Ut,f.j.info("VER="+f.ka));const Er=Ee[4];Er!=null&&(f.za=Er,f.j.info("SVER="+f.za));const bn=Ee[5];bn!=null&&typeof bn=="number"&&bn>0&&(p=1.5*bn,f.O=p,f.j.info("backChannelRequestTimeoutMs_="+p)),p=f;const Pn=u.g;if(Pn){const Zo=Pn.g?Pn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Zo){var O=p.h;O.g||Zo.indexOf("spdy")==-1&&Zo.indexOf("quic")==-1&&Zo.indexOf("h2")==-1||(O.j=O.l,O.g=new Set,O.h&&(Bc(O,O.h),O.h=null))}if(p.G){const gc=Pn.g?Pn.g.getResponseHeader("X-HTTP-Session-Id"):null;gc&&(p.wa=gc,ye(p.J,p.G,gc))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-u.F,f.j.info("Handshake RTT: "+f.T+"ms")),p=f;var J=u;if(p.na=Bd(p,p.L?p.ba:null,p.W),J.L){Gh(p.h,J);var ae=J,xe=p.O;xe&&(ae.H=xe),ae.D&&(ac(ae),Jo(ae)),p.g=J}else id(p);f.i.length>0&&Wo(f)}else Ee[0]!="stop"&&Ee[0]!="close"||mr(f,7);else f.I==3&&(Ee[0]=="stop"||Ee[0]=="close"?Ee[0]=="stop"?mr(f,7):fc(f):Ee[0]!="noop"&&f.l&&f.l.qa(Ee),f.A=0)}}oi(4)}catch{}}var A_=class{constructor(u,l){this.g=u,this.map=l}};function Vh(u){this.l=u||10,o.PerformanceNavigationTiming?(u=o.performance.getEntriesByType("navigation"),u=u.length>0&&(u[0].nextHopProtocol=="hq"||u[0].nextHopProtocol=="h2")):u=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=u?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function kh(u){return u.h?!0:u.g?u.g.size>=u.j:!1}function Mh(u){return u.h?1:u.g?u.g.size:0}function cc(u,l){return u.h?u.h==l:u.g?u.g.has(l):!1}function Bc(u,l){u.g?u.g.add(l):u.h=l}function Gh(u,l){u.h&&u.h==l?u.h=null:u.g&&u.g.has(l)&&u.g.delete(l)}Vh.prototype.cancel=function(){if(this.i=Uh(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const u of this.g.values())u.cancel();this.g.clear()}};function Uh(u){if(u.h!=null)return u.i.concat(u.h.G);if(u.g!=null&&u.g.size!==0){let l=u.i;for(const f of u.g.values())l=l.concat(f.G);return l}return I(u.i)}var Hh=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function v_(u,l){if(u){u=u.split("&");for(let f=0;f<u.length;f++){const p=u[f].indexOf("=");let S,O=null;p>=0?(S=u[f].substring(0,p),O=u[f].substring(p+1)):S=u[f],l(S,O?decodeURIComponent(O.replace(/\+/g," ")):"")}}}function An(u){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let l;u instanceof An?(this.l=u.l,li(this,u.j),this.o=u.o,this.g=u.g,hi(this,u.u),this.h=u.h,lc(this,$h(u.i)),this.m=u.m):u&&(l=String(u).match(Hh))?(this.l=!1,li(this,l[1]||"",!0),this.o=di(l[2]||""),this.g=di(l[3]||"",!0),hi(this,l[4]),this.h=di(l[5]||"",!0),lc(this,l[6]||"",!0),this.m=di(l[7]||"")):(this.l=!1,this.i=new Ci(null,this.l))}An.prototype.toString=function(){const u=[];var l=this.j;l&&u.push(fi(l,jh,!0),":");var f=this.g;return(f||l=="file")&&(u.push("//"),(l=this.o)&&u.push(fi(l,jh,!0),"@"),u.push(ci(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&u.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&u.push("/"),u.push(fi(f,f.charAt(0)=="/"?P_:b_,!0))),(f=this.i.toString())&&u.push("?",f),(f=this.m)&&u.push("#",fi(f,O_)),u.join("")},An.prototype.resolve=function(u){const l=Gt(this);let f=!!u.j;f?li(l,u.j):f=!!u.o,f?l.o=u.o:f=!!u.g,f?l.g=u.g:f=u.u!=null;var p=u.h;if(f)hi(l,u.u);else if(f=!!u.h){if(p.charAt(0)!="/")if(this.g&&!this.h)p="/"+p;else{var S=l.h.lastIndexOf("/");S!=-1&&(p=l.h.slice(0,S+1)+p)}if(S=p,S==".."||S==".")p="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){p=S.lastIndexOf("/",0)==0,S=S.split("/");const O=[];for(let J=0;J<S.length;){const ae=S[J++];ae=="."?p&&J==S.length&&O.push(""):ae==".."?((O.length>1||O.length==1&&O[0]!="")&&O.pop(),p&&J==S.length&&O.push("")):(O.push(ae),p=!0)}p=O.join("/")}else p=S}return f?l.h=p:f=u.i.toString()!=="",f?lc(l,$h(u.i)):f=!!u.m,f&&(l.m=u.m),l};function Gt(u){return new An(u)}function li(u,l,f){u.j=f?di(l,!0):l,u.j&&(u.j=u.j.replace(/:$/,""))}function hi(u,l){if(l){if(l=Number(l),isNaN(l)||l<0)throw Error("Bad port number "+l);u.u=l}else u.u=null}function lc(u,l,f){l instanceof Ci?(u.i=l,N_(u.i,u.l)):(f||(l=fi(l,S_)),u.i=new Ci(l,u.l))}function ye(u,l,f){u.i.set(l,f)}function Ko(u){return ye(u,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),u}function di(u,l){return u?l?decodeURI(u.replace(/%25/g,"%2525")):decodeURIComponent(u):""}function fi(u,l,f){return typeof u=="string"?(u=encodeURI(u).replace(l,R_),f&&(u=u.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),u):null}function R_(u){return u=u.charCodeAt(0),"%"+(u>>4&15).toString(16)+(u&15).toString(16)}var jh=/[#\/\?@]/g,b_=/[#\?:]/g,P_=/[#\?]/g,S_=/[#\?@]/g,O_=/#/g;function Ci(u,l){this.h=this.g=null,this.i=u||null,this.j=!!l}function gr(u){u.g||(u.g=new Map,u.h=0,u.i&&v_(u.i,function(l,f){u.add(decodeURIComponent(l.replace(/\+/g," ")),f)}))}r=Ci.prototype,r.add=function(u,l){gr(this),this.i=null,u=rs(this,u);let f=this.g.get(u);return f||this.g.set(u,f=[]),f.push(l),this.h+=1,this};function qh(u,l){gr(u),l=rs(u,l),u.g.has(l)&&(u.i=null,u.h-=u.g.get(l).length,u.g.delete(l))}function Jh(u,l){return gr(u),l=rs(u,l),u.g.has(l)}r.forEach=function(u,l){gr(this),this.g.forEach(function(f,p){f.forEach(function(S){u.call(l,S,p,this)},this)},this)};function Kh(u,l){gr(u);let f=[];if(typeof l=="string")Jh(u,l)&&(f=f.concat(u.g.get(rs(u,l))));else for(u=Array.from(u.g.values()),l=0;l<u.length;l++)f=f.concat(u[l]);return f}r.set=function(u,l){return gr(this),this.i=null,u=rs(this,u),Jh(this,u)&&(this.h-=this.g.get(u).length),this.g.set(u,[l]),this.h+=1,this},r.get=function(u,l){return u?(u=Kh(this,u),u.length>0?String(u[0]):l):l};function zh(u,l,f){qh(u,l),f.length>0&&(u.i=null,u.g.set(rs(u,l),I(f)),u.h+=f.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const u=[],l=Array.from(this.g.keys());for(let p=0;p<l.length;p++){var f=l[p];const S=ci(f);f=Kh(this,f);for(let O=0;O<f.length;O++){let J=S;f[O]!==""&&(J+="="+ci(f[O])),u.push(J)}}return this.i=u.join("&")};function $h(u){const l=new Ci;return l.i=u.i,u.g&&(l.g=new Map(u.g),l.h=u.h),l}function rs(u,l){return l=String(l),u.j&&(l=l.toLowerCase()),l}function N_(u,l){l&&!u.j&&(gr(u),u.i=null,u.g.forEach(function(f,p){const S=p.toLowerCase();p!=S&&(qh(this,p),zh(this,S,f))},u)),u.j=l}function F_(u,l){const f=new ui;if(o.Image){const p=new Image;p.onload=h(vn,f,"TestLoadImage: loaded",!0,l,p),p.onerror=h(vn,f,"TestLoadImage: error",!1,l,p),p.onabort=h(vn,f,"TestLoadImage: abort",!1,l,p),p.ontimeout=h(vn,f,"TestLoadImage: timeout",!1,l,p),o.setTimeout(function(){p.ontimeout&&p.ontimeout()},1e4),p.src=u}else l(!1)}function L_(u,l){const f=new ui,p=new AbortController,S=setTimeout(()=>{p.abort(),vn(f,"TestPingServer: timeout",!1,l)},1e4);fetch(u,{signal:p.signal}).then(O=>{clearTimeout(S),O.ok?vn(f,"TestPingServer: ok",!0,l):vn(f,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(S),vn(f,"TestPingServer: error",!1,l)})}function vn(u,l,f,p,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),p(f)}catch{}}function x_(){this.g=new m_}function hc(u){this.i=u.Sb||null,this.h=u.ab||!1}d(hc,wh),hc.prototype.g=function(){return new zo(this.i,this.h)};function zo(u,l){We.call(this),this.H=u,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}d(zo,We),r=zo.prototype,r.open=function(u,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=u,this.D=l,this.readyState=1,gi(this)},r.send=function(u){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const l={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};u&&(l.body=u),(this.H||o).fetch(new Request(this.D,l)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,pi(this)),this.readyState=0},r.Pa=function(u){if(this.g&&(this.l=u,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=u.headers,this.readyState=2,gi(this)),this.g&&(this.readyState=3,gi(this),this.g)))if(this.responseType==="arraybuffer")u.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in u){if(this.j=u.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Qh(this)}else u.text().then(this.Oa.bind(this),this.ga.bind(this))};function Qh(u){u.j.read().then(u.Ma.bind(u)).catch(u.ga.bind(u))}r.Ma=function(u){if(this.g){if(this.o&&u.value)this.response.push(u.value);else if(!this.o){var l=u.value?u.value:new Uint8Array(0);(l=this.B.decode(l,{stream:!u.done}))&&(this.response=this.responseText+=l)}u.done?pi(this):gi(this),this.readyState==3&&Qh(this)}},r.Oa=function(u){this.g&&(this.response=this.responseText=u,pi(this))},r.Na=function(u){this.g&&(this.response=u,pi(this))},r.ga=function(){this.g&&pi(this)};function pi(u){u.readyState=4,u.l=null,u.j=null,u.B=null,gi(u)}r.setRequestHeader=function(u,l){this.A.append(u,l)},r.getResponseHeader=function(u){return this.h&&this.h.get(u.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const u=[],l=this.h.entries();for(var f=l.next();!f.done;)f=f.value,u.push(f[0]+": "+f[1]),f=l.next();return u.join(`\r
`)};function gi(u){u.onreadystatechange&&u.onreadystatechange.call(u)}Object.defineProperty(zo.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(u){this.m=u?"include":"same-origin"}});function Wh(u){let l="";return Go(u,function(f,p){l+=p,l+=":",l+=f,l+=`\r
`}),l}function dc(u,l,f){e:{for(p in f){var p=!1;break e}p=!0}p||(f=Wh(f),typeof u=="string"?f!=null&&ci(f):ye(u,l,f))}function Re(u){We.call(this),this.headers=new Map,this.L=u||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}d(Re,We);var V_=/^https?$/i,k_=["POST","PUT"];r=Re.prototype,r.Fa=function(u){this.H=u},r.ea=function(u,l,f,p){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+u);l=l?l.toUpperCase():"GET",this.D=u,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Sh.g(),this.g.onreadystatechange=C(B(this.Ca,this));try{this.B=!0,this.g.open(l,String(u),!0),this.B=!1}catch(O){Yh(this,O);return}if(u=f||"",f=new Map(this.headers),p)if(Object.getPrototypeOf(p)===Object.prototype)for(var S in p)f.set(S,p[S]);else if(typeof p.keys=="function"&&typeof p.get=="function")for(const O of p.keys())f.set(O,p.get(O));else throw Error("Unknown input type for opt_headers: "+String(p));p=Array.from(f.keys()).find(O=>O.toLowerCase()=="content-type"),S=o.FormData&&u instanceof o.FormData,!(Array.prototype.indexOf.call(k_,l,void 0)>=0)||p||S||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[O,J]of f)this.g.setRequestHeader(O,J);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(u),this.v=!1}catch(O){Yh(this,O)}};function Yh(u,l){u.h=!1,u.g&&(u.j=!0,u.g.abort(),u.j=!1),u.l=l,u.o=5,Xh(u),$o(u)}function Xh(u){u.A||(u.A=!0,rt(u,"complete"),rt(u,"error"))}r.abort=function(u){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=u||7,rt(this,"complete"),rt(this,"abort"),$o(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),$o(this,!0)),Re.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?Zh(this):this.Xa())},r.Xa=function(){Zh(this)};function Zh(u){if(u.h&&typeof i<"u"){if(u.v&&Rn(u)==4)setTimeout(u.Ca.bind(u),0);else if(rt(u,"readystatechange"),Rn(u)==4){u.h=!1;try{const O=u.ca();e:switch(O){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break e;default:l=!1}var f;if(!(f=l)){var p;if(p=O===0){let J=String(u.D).match(Hh)[1]||null;!J&&o.self&&o.self.location&&(J=o.self.location.protocol.slice(0,-1)),p=!V_.test(J?J.toLowerCase():"")}f=p}if(f)rt(u,"complete"),rt(u,"success");else{u.o=6;try{var S=Rn(u)>2?u.g.statusText:""}catch{S=""}u.l=S+" ["+u.ca()+"]",Xh(u)}}finally{$o(u)}}}}function $o(u,l){if(u.g){u.m&&(clearTimeout(u.m),u.m=null);const f=u.g;u.g=null,l||rt(u,"ready");try{f.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function Rn(u){return u.g?u.g.readyState:0}r.ca=function(){try{return Rn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(u){if(this.g){var l=this.g.responseText;return u&&l.indexOf(u)==0&&(l=l.substring(u.length)),g_(l)}};function ed(u){try{if(!u.g)return null;if("response"in u.g)return u.g.response;switch(u.F){case"":case"text":return u.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in u.g)return u.g.mozResponseArrayBuffer}return null}catch{return null}}function M_(u){const l={};u=(u.g&&Rn(u)>=2&&u.g.getAllResponseHeaders()||"").split(`\r
`);for(let p=0;p<u.length;p++){if(_(u[p]))continue;var f=y_(u[p]);const S=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const O=l[S]||[];l[S]=O,O.push(f)}l_(l,function(p){return p.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function mi(u,l,f){return f&&f.internalChannelParams&&f.internalChannelParams[u]||l}function td(u){this.za=0,this.i=[],this.j=new ui,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=mi("failFast",!1,u),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=mi("baseRetryDelayMs",5e3,u),this.Za=mi("retryDelaySeedMs",1e4,u),this.Ta=mi("forwardChannelMaxRetries",2,u),this.va=mi("forwardChannelRequestTimeoutMs",2e4,u),this.ma=u&&u.xmlHttpFactory||void 0,this.Ua=u&&u.Rb||void 0,this.Aa=u&&u.useFetchStreams||!1,this.O=void 0,this.L=u&&u.supportsCrossDomainXhr||!1,this.M="",this.h=new Vh(u&&u.concurrentRequestLimit),this.Ba=new x_,this.S=u&&u.fastHandshake||!1,this.R=u&&u.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=u&&u.Pb||!1,u&&u.ua&&this.j.ua(),u&&u.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&u&&u.detectBufferingProxy||!1,this.ia=void 0,u&&u.longPollingTimeout&&u.longPollingTimeout>0&&(this.ia=u.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=td.prototype,r.ka=8,r.I=1,r.connect=function(u,l,f,p){st(0),this.W=u,this.H=l||{},f&&p!==void 0&&(this.H.OSID=f,this.H.OAID=p),this.F=this.X,this.J=Bd(this,null,this.W),Wo(this)};function fc(u){if(nd(u),u.I==3){var l=u.V++,f=Gt(u.J);if(ye(f,"SID",u.M),ye(f,"RID",l),ye(f,"TYPE","terminate"),Ei(u,f),l=new Tn(u,u.j,l),l.M=2,l.A=Ko(Gt(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(l.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=l.A,f=!0),f||(l.g=ld(l.j,null),l.g.ea(l.A)),l.F=Date.now(),Jo(l)}cd(u)}function Qo(u){u.g&&(pc(u),u.g.cancel(),u.g=null)}function nd(u){Qo(u),u.v&&(o.clearTimeout(u.v),u.v=null),Yo(u),u.h.cancel(),u.m&&(typeof u.m=="number"&&o.clearTimeout(u.m),u.m=null)}function Wo(u){if(!kh(u.h)&&!u.m){u.m=!0;var l=u.Ea;fe||m(),oe||(fe(),oe=!0),y.add(l,u),u.D=0}}function G_(u,l){return Mh(u.h)>=u.h.j-(u.m?1:0)?!1:u.m?(u.i=l.G.concat(u.i),!0):u.I==1||u.I==2||u.D>=(u.Sa?0:u.Ta)?!1:(u.m=ai(B(u.Ea,u,l),ud(u,u.D)),u.D++,!0)}r.Ea=function(u){if(this.m)if(this.m=null,this.I==1){if(!u){this.V=Math.floor(Math.random()*1e5),u=this.V++;const S=new Tn(this,this.j,u);let O=this.o;if(this.U&&(O?(O=fh(O),ph(O,this.U)):O=this.U),this.u!==null||this.R||(S.J=O,O=null),this.S)e:{for(var l=0,f=0;f<this.i.length;f++){t:{var p=this.i[f];if("__data__"in p.map&&(p=p.map.__data__,typeof p=="string")){p=p.length;break t}p=void 0}if(p===void 0)break;if(l+=p,l>4096){l=f;break e}if(l===4096||f===this.i.length-1){l=f+1;break e}}l=1e3}else l=1e3;l=sd(this,S,l),f=Gt(this.J),ye(f,"RID",u),ye(f,"CVER",22),this.G&&ye(f,"X-HTTP-Session-Id",this.G),Ei(this,f),O&&(this.R?l="headers="+ci(Wh(O))+"&"+l:this.u&&dc(f,this.u,O)),Bc(this.h,S),this.Ra&&ye(f,"TYPE","init"),this.S?(ye(f,"$req",l),ye(f,"SID","null"),S.U=!0,oc(S,f,null)):oc(S,f,l),this.I=2}}else this.I==3&&(u?rd(this,u):this.i.length==0||kh(this.h)||rd(this))};function rd(u,l){var f;l?f=l.l:f=u.V++;const p=Gt(u.J);ye(p,"SID",u.M),ye(p,"RID",f),ye(p,"AID",u.K),Ei(u,p),u.u&&u.o&&dc(p,u.u,u.o),f=new Tn(u,u.j,f,u.D+1),u.u===null&&(f.J=u.o),l&&(u.i=l.G.concat(u.i)),l=sd(u,f,1e3),f.H=Math.round(u.va*.5)+Math.round(u.va*.5*Math.random()),Bc(u.h,f),oc(f,p,l)}function Ei(u,l){u.H&&Go(u.H,function(f,p){ye(l,p,f)}),u.l&&Go({},function(f,p){ye(l,p,f)})}function sd(u,l,f){f=Math.min(u.i.length,f);const p=u.l?B(u.l.Ka,u.l,u):null;e:{var S=u.i;let ae=-1;for(;;){const xe=["count="+f];ae==-1?f>0?(ae=S[0].g,xe.push("ofs="+ae)):ae=0:xe.push("ofs="+ae);let Ee=!0;for(let Ue=0;Ue<f;Ue++){var O=S[Ue].g;const Ut=S[Ue].map;if(O-=ae,O<0)ae=Math.max(0,S[Ue].g-100),Ee=!1;else try{O="req"+O+"_"||"";try{var J=Ut instanceof Map?Ut:Object.entries(Ut);for(const[Er,bn]of J){let Pn=bn;a(bn)&&(Pn=tc(bn)),xe.push(O+Er+"="+encodeURIComponent(Pn))}}catch(Er){throw xe.push(O+"type="+encodeURIComponent("_badmap")),Er}}catch{p&&p(Ut)}}if(Ee){J=xe.join("&");break e}}J=void 0}return u=u.i.splice(0,f),l.G=u,J}function id(u){if(!u.g&&!u.v){u.Y=1;var l=u.Da;fe||m(),oe||(fe(),oe=!0),y.add(l,u),u.A=0}}function Cc(u){return u.g||u.v||u.A>=3?!1:(u.Y++,u.v=ai(B(u.Da,u),ud(u,u.A)),u.A++,!0)}r.Da=function(){if(this.v=null,od(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var u=4*this.T;this.j.info("BP detection timer enabled: "+u),this.B=ai(B(this.Wa,this),u)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,st(10),Qo(this),od(this))};function pc(u){u.B!=null&&(o.clearTimeout(u.B),u.B=null)}function od(u){u.g=new Tn(u,u.j,"rpc",u.Y),u.u===null&&(u.g.J=u.o),u.g.P=0;var l=Gt(u.na);ye(l,"RID","rpc"),ye(l,"SID",u.M),ye(l,"AID",u.K),ye(l,"CI",u.F?"0":"1"),!u.F&&u.ia&&ye(l,"TO",u.ia),ye(l,"TYPE","xmlhttp"),Ei(u,l),u.u&&u.o&&dc(l,u.u,u.o),u.O&&(u.g.H=u.O);var f=u.g;u=u.ba,f.M=1,f.A=Ko(Gt(l)),f.u=null,f.R=!0,Fh(f,u)}r.Va=function(){this.C!=null&&(this.C=null,Qo(this),Cc(this),st(19))};function Yo(u){u.C!=null&&(o.clearTimeout(u.C),u.C=null)}function ad(u,l){var f=null;if(u.g==l){Yo(u),pc(u),u.g=null;var p=2}else if(cc(u.h,l))f=l.G,Gh(u.h,l),p=1;else return;if(u.I!=0){if(l.o)if(p==1){f=l.u?l.u.length:0,l=Date.now()-l.F;var S=u.D;p=jo(),rt(p,new bh(p,f)),Wo(u)}else id(u);else if(S=l.m,S==3||S==0&&l.X>0||!(p==1&&G_(u,l)||p==2&&Cc(u)))switch(f&&f.length>0&&(l=u.h,l.i=l.i.concat(f)),S){case 1:mr(u,5);break;case 4:mr(u,10);break;case 3:mr(u,6);break;default:mr(u,2)}}}function ud(u,l){let f=u.Qa+Math.floor(Math.random()*u.Za);return u.isActive()||(f*=2),f*l}function mr(u,l){if(u.j.info("Error code "+l),l==2){var f=B(u.bb,u),p=u.Ua;const S=!p;p=new An(p||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||li(p,"https"),Ko(p),S?F_(p.toString(),f):L_(p.toString(),f)}else st(2);u.I=0,u.l&&u.l.pa(l),cd(u),nd(u)}r.bb=function(u){u?(this.j.info("Successfully pinged google.com"),st(2)):(this.j.info("Failed to ping google.com"),st(1))};function cd(u){if(u.I=0,u.ja=[],u.l){const l=Uh(u.h);(l.length!=0||u.i.length!=0)&&(R(u.ja,l),R(u.ja,u.i),u.h.i.length=0,I(u.i),u.i.length=0),u.l.oa()}}function Bd(u,l,f){var p=f instanceof An?Gt(f):new An(f);if(p.g!="")l&&(p.g=l+"."+p.g),hi(p,p.u);else{var S=o.location;p=S.protocol,l=l?l+"."+S.hostname:S.hostname,S=+S.port;const O=new An(null);p&&li(O,p),l&&(O.g=l),S&&hi(O,S),f&&(O.h=f),p=O}return f=u.G,l=u.wa,f&&l&&ye(p,f,l),ye(p,"VER",u.ka),Ei(u,p),p}function ld(u,l,f){if(l&&!u.L)throw Error("Can't create secondary domain capable XhrIo object.");return l=u.Aa&&!u.ma?new Re(new hc({ab:f})):new Re(u.ma),l.Fa(u.L),l}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function hd(){}r=hd.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function Xo(){}Xo.prototype.g=function(u,l){return new Ct(u,l)};function Ct(u,l){We.call(this),this.g=new td(l),this.l=u,this.h=l&&l.messageUrlParams||null,u=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(u?u["X-Client-Protocol"]="webchannel":u={"X-Client-Protocol":"webchannel"}),this.g.o=u,u=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(u?u["X-WebChannel-Content-Type"]=l.messageContentType:u={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.sa&&(u?u["X-WebChannel-Client-Profile"]=l.sa:u={"X-WebChannel-Client-Profile":l.sa}),this.g.U=u,(u=l&&l.Qb)&&!_(u)&&(this.g.u=u),this.A=l&&l.supportsCrossDomainXhr||!1,this.v=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!_(l)&&(this.g.G=l,u=this.h,u!==null&&l in u&&(u=this.h,l in u&&delete u[l])),this.j=new ss(this)}d(Ct,We),Ct.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Ct.prototype.close=function(){fc(this.g)},Ct.prototype.o=function(u){var l=this.g;if(typeof u=="string"){var f={};f.__data__=u,u=f}else this.v&&(f={},f.__data__=tc(u),u=f);l.i.push(new A_(l.Ya++,u)),l.I==3&&Wo(l)},Ct.prototype.N=function(){this.g.l=null,delete this.j,fc(this.g),delete this.g,Ct.Z.N.call(this)};function dd(u){nc.call(this),u.__headers__&&(this.headers=u.__headers__,this.statusCode=u.__status__,delete u.__headers__,delete u.__status__);var l=u.__sm__;if(l){e:{for(const f in l){u=f;break e}u=void 0}(this.i=u)&&(u=this.i,l=l!==null&&u in l?l[u]:void 0),this.data=l}else this.data=u}d(dd,nc);function fd(){rc.call(this),this.status=1}d(fd,rc);function ss(u){this.g=u}d(ss,hd),ss.prototype.ra=function(){rt(this.g,"a")},ss.prototype.qa=function(u){rt(this.g,new dd(u))},ss.prototype.pa=function(u){rt(this.g,new fd)},ss.prototype.oa=function(){rt(this.g,"b")},Xo.prototype.createWebChannel=Xo.prototype.g,Ct.prototype.send=Ct.prototype.o,Ct.prototype.open=Ct.prototype.m,Ct.prototype.close=Ct.prototype.close,Dp=function(){return new Xo},_p=function(){return jo()},Ep=Cr,$c={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},qo.NO_ERROR=0,qo.TIMEOUT=8,qo.HTTP_ERROR=6,Ca=qo,Ph.COMPLETE="complete",mp=Ph,Th.EventType=ii,ii.OPEN="a",ii.CLOSE="b",ii.ERROR="c",ii.MESSAGE="d",We.prototype.listen=We.prototype.J,bi=Th,Re.prototype.listenOnce=Re.prototype.K,Re.prototype.getLastError=Re.prototype.Ha,Re.prototype.getLastErrorCode=Re.prototype.ya,Re.prototype.getStatus=Re.prototype.ca,Re.prototype.getResponseJson=Re.prototype.La,Re.prototype.getResponseText=Re.prototype.la,Re.prototype.send=Re.prototype.ea,Re.prototype.setWithCredentials=Re.prototype.Fa,gp=Re}).apply(typeof ea<"u"?ea:typeof self<"u"?self:typeof window<"u"?window:{});/*!
* re2js
* RE2JS is the JavaScript port of RE2, a regular expression engine that provides linear time matching
*
* @version v2.8.6
* @author Oleksii Vasyliev
* @homepage https://github.com/le0pard/re2js#readme
* @repository github:le0pard/re2js
* @license MIT
*/var k=class Dr{static FOLD_CASE=1;static LITERAL=2;static CLASS_NL=4;static DOT_NL=8;static ONE_LINE=16;static NON_GREEDY=32;static PERL_X=64;static UNICODE_GROUPS=128;static WAS_DOLLAR=256;static LOOKBEHIND=512;static MATCH_NL=Dr.CLASS_NL|Dr.DOT_NL;static PERL=Dr.CLASS_NL|Dr.ONE_LINE|Dr.PERL_X|Dr.UNICODE_GROUPS;static POSIX=0;static UNANCHORED=0;static ANCHOR_START=1;static ANCHOR_BOTH=2};const is={CASE_INSENSITIVE:1,DOTALL:2,MULTILINE:4,DISABLE_UNICODE_GROUPS:8,LONGEST_MATCH:16,LOOKBEHINDS:512},Wi=128,Qc=new Int32Array(Wi),Wc=new Int32Array(Wi),ta=65535;for(let r=0;r<Wi;r++)r>=97&&r<=122?Qc[r]=r-32:Qc[r]=r,r>=65&&r<=90?Wc[r]=r+32:Wc[r]=r;var F=class{static CODES=new Map([["\x07",7],["\b",8],["	",9],[`
`,10],["\v",11],["\f",12],["\r",13],[" ",32],['"',34],["$",36],["&",38],["'",39],["(",40],[")",41],["*",42],["+",43],["-",45],[".",46],["0",48],["1",49],["2",50],["3",51],["4",52],["5",53],["6",54],["7",55],["8",56],["9",57],[":",58],["<",60],[">",62],["?",63],["A",65],["B",66],["C",67],["F",70],["P",80],["Q",81],["U",85],["Z",90],["[",91],["\\",92],["]",93],["^",94],["_",95],["`",96],["a",97],["b",98],["f",102],["i",105],["m",109],["n",110],["r",114],["s",115],["t",116],["v",118],["x",120],["z",122],["{",123],["|",124],["}",125]]);static toUpperCase(r){if(r<Wi)return Qc[r];const e=String.fromCodePoint(r).toUpperCase(),t=e.codePointAt(0)>ta?2:1;if(e.length>t)return r;const n=String.fromCodePoint(e.codePointAt(0)).toLowerCase(),s=n.codePointAt(0)>ta?2:1;return n.length>s||n.codePointAt(0)!==r?r:e.codePointAt(0)}static toLowerCase(r){if(r<Wi)return Wc[r];const e=String.fromCodePoint(r).toLowerCase(),t=e.codePointAt(0)>ta?2:1;if(e.length>t)return r;const n=String.fromCodePoint(e.codePointAt(0)).toUpperCase(),s=n.codePointAt(0)>ta?2:1;return n.length>s||n.codePointAt(0)!==r?r:e.codePointAt(0)}},g=class{constructor(r,e=!1){this.data=r,this.isStride1=e,this.SIZE=e?2:3}getLo(r){return this.data[r*this.SIZE]}getHi(r){return this.data[r*this.SIZE+1]}getStride(r){return this.isStride1?1:this.data[r*this.SIZE+2]}get length(){return this.data.length/this.SIZE}};const Ip=new Uint8Array(256);for(let r=0,e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";r<64;r++)Ip[e.charCodeAt(r)]=r;const yp=r=>{const e=[];let t=0,n=0;for(let s=0;s<r.length;s++){let i=Ip[r.charCodeAt(s)];t|=(i&31)<<n,i&32?n+=5:(e.push(t),t=0,n=0)}return e},E=(r,e)=>{const t=yp(r),n=e?t.length/2:t.length/3,s=new Uint32Array(n*3);let i=0,o=0;for(let a=0;a<n;a++)i+=t[o++],s[a*3]=i,i+=t[o++],s[a*3+1]=i,s[a*3+2]=e?1:t[o++];return s},OI=r=>{const e=yp(r),t=new Map;let n=0;for(let s=0;s<e.length;s+=2){n+=e[s];const i=e[s+1],o=i>>>1^-(i&1);t.set(n,n+o)}return t};var na=class{constructor(r){this.initializer=r,this.cache=new Map}has(r){return r in this.initializer}get(r){if(this.cache.has(r))return this.cache.get(r);const e=this.initializer[r],t=e?e():null;return this.cache.set(r,t),t}},ct=class{static _CASE_ORBIT=null;static get CASE_ORBIT(){return this._CASE_ORBIT||(this._CASE_ORBIT=OI("rCgCIgCY+rQI4QiCuuBLgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCCgCBgCBgCBgCBgCBgCBgCB+7OB-BB-BB-BB-BB-BBskQB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BC-BB-BB-BB-BB-BB-BB-BByHBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBDCBBBCBBBCBBCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBxHBCBBBCBBBCBBB3SBmMBkNBCBBBCBBB8MBCBBB6MB6MBCBBC+EB0MB2MBCBBB6MB+MBiGBmNBiNBCBBBmKBikzCBmNBqNBkIBsNBCBBBCBBBCBBB0NBCBBB0NDCBBB0NBCBBByNByNBCBBBCBBB2NBCBBDCBBCwDFCBCBDBCBCBDBCBCBDBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBB9EBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCCBCBDBCBBBhGBvDBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBjICCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBH2iVBCBBBlKBwiVB+jVB+jVBCBBBlMBqEBuEBCBBBCBBBCBBBCBBBCBBB+hVB4hVB8hVBjNB7MC5MB5MCzMC1MB+0yCE5MB20yCC9MBu2yCBwyyCBo0yCChNBlNBo0yCBu-UBi0yCDlNC6-UBpNDrNIu+UDzNCm0yCBzNE0yyCBzNBpEBxNBxNBtEG1NLqxyCBkxyCnFoFrBCBBBCBBDCBBEkIBkIBkICoHHsCCqCBqCBqCCgEC+DB+DBmkOBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCC+BBgCBgCBgCBgCBgCBgCBgCBgCBrCBpCBpCBpCBmjOB-BB8BB-BB-BBgEB-BB-BByBBqgOBsDB-BBtwBB-BB-BB-BBsBBgDBCB-BB-BB-BBeB-BB-BB61OB-BB-BB-DB9DB9DBQB7DBmCE9CBrDBPBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBrFB-EBOBnHB3FB-FCCBBBNBCBBCjIBjIBjIBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgFBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB8kMB-BB6kMB-BB-BB-BB-BB-BB-BB-BB-BB-BBokMB-BB-BBkkMBkkMB-BB-BB-BB-BB-BB-BB-BB4jMB-BB-BB-BB-BB-BB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EB-EBCBBBCBoiMBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBJCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBeBCBBBCBBBCBBBCBBBCBBBCBBBCBBBdBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBCgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDL-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-C64CgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOBgmOCgmOGgmODg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FBg8FDg8FBg8FBg8FhVg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBg9rCBQBQBQBQBQBQDPBPBPBPBPBPjkC7mMB5mMBnmMBjmMBCBlmMB3lMBpiMBk8kCBCBBG-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FB-7FD-7FB-7FB-7F6FoglCEsuHRwjlCyDCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCB0DBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBG1DD97OCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQDPBPBPBPBPBPDQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQDPBPBPBPBPBPEQCQCQCQCPCPCPCPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPB0EB0EBsFBsFBsFBsFBoGBoGBgIBgIBgHBgHB8HB8HDQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQBQBQBQBQBQBQBPBPBPBPBPBPBPBPBQBQCSFPBPBzEBzEBRCxnOFSFrFBrFBrFBrFBREQBQClkOFPBPBnGBnGFQBQCljOCODPBPB-GB-GBNHSF-HB-HB7HB7HBRqJ53OE9tQBrmQH4Bc3BSgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBgBBfBfBfBfBfBfBfBfBfBfBfBfBfBfBfBfECBByZ0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BB0BBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzBBzB34BgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDBgDB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CB-CBCBBBt-UBruHBt+UB1iVBviVBCBBBCBBBCBBB3hVB5-UB9hVB7hVCCBBCCBBI9jVB9jVBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBICBBBCBBECBBN-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOB-lOC-lOG-lOzoeCBBBCBBBCBBBCBBBCBBBCBl8kCBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBTCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBnECBBBCBBBCBBBCBBBCBBBCBBBCBBDCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBKCBBBCBBBnglCBCBBBCBBBCBBBCBBBCBBECBBBvyyCDCBBBCBBBgDCCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBn0yCB90yCB10yCBh0yCBn0yCCjxyCBzyyCBpxyCBg6BBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBB-CBl0yCBvjlCBCBBBCBBBt2yCBCBBBCBBBCBBBCBBBCBBBCBBBCBBBCBBBhkzCZCBB9a-5Bd-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCB-8rCm6TCBB7gBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCH-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BmlBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvChDwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCBwCFvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvCBvC1DuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCCuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCBuCCuCBuCBuCBuCBuCBuCBuCCuCBuCCtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCCtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCBtCCtCBtCBtCBtCBtCBtCBtCCtCBtCk2BgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEBgEO-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-DB-D+CgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCL-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-B74CgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BhrVgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCBgCB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BB-BhB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BB2BD1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BB1BtxekCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBkCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjCBjC")),this._CASE_ORBIT}static _Print=null;static get Print(){return this._Print||(this._Print=new g(E("hB9CBjBLBCpWBDFBFGBCCCBSBCsMBClBBDxBBDCBC2BBJaBFFBSVBC-FBCvBBD6BBDkDBP6BBDwBBDOBCbBDCCBJBGfBIqCBCgFBCHBDBBDVBCGBCEEBCBDIBDBBDDBJFFBCCBDBDYBDCBCFBFBBDVBCGBCBBCBBCBBDCCBDBFBBDCBEIIBCBCIIBPBLCBCIBCCBCVBCGBCBBCEBDJBCCBCCBDQQBCBDLBIGBCCBCHBDBBDVBCGBCBBCEBDIBDBBDCBICBFBBCEBDRBLBBCFBECBCDBEBBCCCBEEBEEBBBELBFEBECBCDBDHHPUBGMBCCBCWBCPBDIBCCBCDBIBBCCBCBBDDBDJBIVBCCBCWBCJBCEBDIBCCBCDBIBBGCBCDBDJBCCBNMBCCBCyBBCCBCFBFPBDZBCCBCRBEXBCIBCDDBFBEFFBEBCCCBGBHJBDCBN5BBFcBmBBBCCCBDBCXBCCCBVBDEBCCCBFBCJBDDBhBnCBCjBBFmBBCjBBCOBCMBmBlGBCGGD4LBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBDfBEZBH1CBDFBD-TBCbBE4CBIVBKXBKTBNMBCCBCBBN9CBDJBHJBHNBCKBH4CBIqBBGlCBLeBCLBFLBFEEBoBBDEBMrBBFZBHKBE9BBDgCBCcBDKBHJBHNBDtBBDLBVsCBClFBJ7BBEOBE9BBGqBBDKBJqBBG1QBDFBDlBBDFBDHBCGCBdBD0BBCOBCNBDFBCSBDCBCIBSXBJuBBSBBDaBCMBEhBBPgBBQrEBF5UBXKBWz4BBD9LBGsBBCGGD3BBIBBPXBKGBCGBCGBCGBCGBCGBCGBCGBC9DBjBZBC4CBN1GBbPBC+BBC1CBDmDBGqBBC9CBC1CBKvBBCszcBE2BBK7KBV3FBJ8GBV7BBEJBH3BBJlCBJLBHzDBMdBEtCBCKBFgBBC2BBKNBDJBDmDBZbBLFBDFBDFBKGBCGBC7BBF9DBDJBHj9KBNWBFwBBloItLBDpDBnBGBNEBGZBCEBCCCBCCBCCBoUBhBpBBHyBBCSBCDBFEBCmEBF9FBEFBDFBDFBDCBEGBCGBOBBDLBCZBCSBCBBCOBDNBjB6DBGCBFsBBE3CBCMBEwBwBBsBBjEcBEwBBQbBFjBBKdBGqBBGdBCkBBFNBrB9EBDJBHjBBFjBBFnBBJzBBMLBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBCnCBJIBxBSBCBBGgBBEaBGaBnB3BBFTBDxBBCBBGHBCCBCcBDCBFJBIIBI-BBhBmBBFLBK1BBEcBDaBGZBIDBNGBxCoCB4ByBBOyBBItBBJJBHlBBEcBJBBxGeBCpBBCCBDBBRFBJIBiBtBBJpBBXZBnBbBVWBKtCBFjBBK9BBCEBOYBIJBH0BBCRBJmBBK-CBCTBMRBCuBB-BGBCCCBCBCOBCKBH6BBGJBHDBCHBDBBDVBCGBCBBCEBCJBDBBDCBDHHGGBDGBEEBMJBCDDClBBCJBCDDCDBCJBCBBJBBe7CBCEBfnCBJJBnF1BBDlBBjBkCBMJBHMBU5BBHJBHTBdaBDOBFWB6F7BBlDyCBNHBDDDBGBCBBCdBCBBDLBKJBnCHBDtBBDKBcnCBJyCBOoCBIJB3CHB5ChBBPJBHIBCsBBCNBLcBEfBDVBCNBqCGBCBBCrBBECCBCCBHBJJBHFBCBBCkBBCBBCFBIJBHrBBFJB3HYBIQBCoBBEcB2CQQBwBBO6cBnDuDBCEBMjGBtyCiDBOvhBBRVBL68DBGmSB61G5BBn2B4RBIeBCJBFwCBCJBHdBDFBLlCBLJBCGBCUBGSBxN5BBnG6CBGYBDYBtBqCBF4BBIQBhCEBMGBK1mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBDDBh7D8HBEzNBHWBQQBQtBBDWBKzDB9B1HBLmBBDpCBJvDBWlCB7DTBNTBN2CBKYBoE0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBD9VBQEBCOBxiBeBHFB2GGBCQBDGBCBBCEBG9BBiBxDxDBrBBENBDJBFBBhKeBS5BBGxOxOBoBB3GqBBFhGhGBdBCVBJBBhHGBCDBCBBCOBCkGBDPBqBrCBFJBFBByYjCBtC8BBjGDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBBvIrBBFjDBNOBDOBCOBCkBBLtFB5BcBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBCmDBmgB-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIBnkzVvHB",!1))),this._Print}static CATEGORIES=new na({C:()=>new g(E("AfBgDgBBOrWrWBHHBCBICCVuMuMnBBBzBBBE4B4BBGBcDBHQBXhGhGxBBB8BBBmDNB8BBByBBBQddBCCMEBhBGBsCiFiFJBBDBBXIICCBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBPMMBEB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKMMBDBbEByBPBDBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBjoIBvLBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCB-FCBHBBHBBHBBECBIIIBLBDBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIB-BGGBLBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMBxhBPBXJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBF-6DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBrCHBxDUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIlkzVBxHvw-FB",!1)),Cc:()=>new g(E("AfgDgB",!0)),Cf:()=>new g(E("tFzqBzqBBEBXhGhGyBhMhMBxCxCs5D9-B9-BBDBbEByBEBCJBw03B6H6HBBBimEQQj7IPBhjiBDBwmFHBn0rYffB+CB",!1)),Cn:()=>new g(E("4bBBHDBICCVuMuMnBBBzBBBE4B4BBGBcDBHKBvI9B9BBmDmDBMB8BBByBBBQddBCCMEBjBEBuHJJBDDBXXICCBBBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBbFB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKmDmDNBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBDBvzIBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCC-FCBHBBHBBHBBECBIIIBIBGBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIBlCJBCBBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMB3iBJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBJ76DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBjGUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIm8yVBCdBhD-DBxHvw-BB---BBB---BBB",!1)),Co:()=>new g(E("gg4B-nGh4hc9--BD9--B",!0)),Cs:()=>new g(E("gg2B--B",!0)),L:()=>new g(E("hCZBHZBwBLLFGGBVBCeBCpOBFLBPEBICCiEEBCBBDDBCHHCCBCCCBSBCyCBCqEBJlFBClBBDHHBnBBoCaBFDBuBqBBkBBBCiDBCQQBIIBLLBBBDRRCdBe4CBMZZBfBKBBFGGBUBFKKEYYBXBIKBGXBCGBRpBB7B1BBETTIJBQPBFHBDBBDVBCGBCEEBCBERROBBCCBPBBLJJBEBFBBDVBCGBCBBCBBCBBgBDBCUUBBBRIBCCBCVBCGBCBBCEBETTQBBYMMBGBDBBDVBCGBCBBCEBEffBCCBBBQSSCFBECBCDBEBBCCCBEEBEEBBBELBX1B1BBGBCCBCWBCPBEbbBBBCBBDBBfFFBGBCCBCWBCJBCEBEffBBBCBBQBBSIBCCBCoBBDRRGCBJCBZFBGRBEXBCIBCDDBFB7BvBBCBBNGB7BBBCCCBDBCXBCCCBIBCBBKDDBDBCWWBCBhBgCgCBGBCjBBcEB0DqBBVRRBEBFDBEEEBIIBBBFMBNSSBkBBCGGDqBBCsKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPBR1CBDFBErTBDQBCZBGqCBHHBIRBOSBPRBPMBCCBQzBBkBFFkC4CBIEBDhBBCGGBkCBLeByBdBDEBMrBBFZB3BWBK0BBzC+C+CBtBBSHB3BdBOBBLrBBbjBBqBCBLjBBDKBGqBBDCBqBDBCFBCBBEGGB+FBhC1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGB1DOORMBmDFFDJBCEEBDBHGCBCBCKBDDBGEBF1B1BB8zC8zCBjHBHDBEBBNlBBCGGD3BBIRRBVBKGBCGBCGBCGBCGBCGBCGBCGBxC2O2OBrBrBBDBGBBF1CBHCBC5CBCDBGqBBC9CBSfBxBPBhQ-tGBhCs0VBkCtBBDsIBEPBLBBVuBBReBDlCByBIBDmDBDxCBVQBCCBCDBCWBezBBPxBB-BFBECCBMMBaBLWBacBIuBBdRRBDBCJBLEBCoBBYCBCHBVWBEEEBwBBCEEBDDBDBDCCZCBDKBICBNFBDFBDFBKGBCGBCqBBCNBHyDBej9KBNWBFwBBloItLBDpDBnBGBNEBGCCBIBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBlBZBHZBM4CBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmMcBEwBBwBfBOTBCHBHlBBLdBDjBBFHBxB9EBTjBBFjBBFnBBJzBBNKBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCQQBCBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4ByBBOyBBOjBBnBbBKWB7HpBBHBBRFB5BcBLJJBUBrBRBvBUBcWBN0BB6BBBDOOBrBBhBYBbjBBeDDJiBBENNBuBBPDBWCCkBRBCYBUBBgCGBCCCBCBCOBCJBIuBBnBHBDBBDVBCGBCBBCEBETTNEBfJBCDDClBBCaaCtBtBBzBBTDBVCBfvBBVBBC5F5FBtBBqBDBlBvBBV8B8BBpBBOoCoCBZBmBGB6FrBB1D-BBgBHBDDDBGBCBBCXBQCC-CHBDmBBRCCdLLBmBBIWWMtBBUTTBnCBoGgBBgBIBCkBBSyByBBcBxDGBCBBClBBWaaBEBCBBCfBPYYBqBBlISBQCCBLBChBB9DwCwCB4cBnHjGBtyCgDBQvhBBSFBa68DBGmSB61GdBj3B4RBIeBSuCBSdBTvBBRDBgBUBGSBxNsBB0G-BBhBYBDYBtBqCBGjCjCBLBhCBBCPPBNNB0mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBn7F0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BeBHFBmI9BBzEsBBLGBRiKiKBcBTrBBlPbBlHdBDwGwGBdBCCBCBBCGBDEBKBBhHGBCDBCBBCOBCkGB8BjCBI1lB1lBBCBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQBlqE-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),LC:()=>new g(E("hCZBHZB7BLLBVBCeBCiGBCDBFvGBDZBhGDBDBBECBCHHCCBCCCBSBCyCBCqEBJlFBClBBKoBB44ClBBCGGDqBBDCBhV1CBDFBjkCKBGqBBDCBhCrBBgCMBChBBmD1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGBmIFFDJBCEEBDBHGCBCBCFBFDDBCBGEBF1B1BB8zC8zCB6DBDmDBHDBEBBNlBBCGGzoetBBTbBnEtCBCWBEDBCsCBZBBE2Z2ZBpBBGIBIvCBh6TGBNEBqgBZBHZBmlBvCBhDjBBFjBB1DKBCOBCGBCBBCKBCOBCGBCBBk2ByBBOyBB+CVBLVB74C-BBhrV-BBhBYBDYBtpZ0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BJBCTBHFB2uCjCB",!1)),Ll:()=>new g(E("hDZB7BqBqBBWBCHBC2BCBQCBuBCDECBBBDCCDEEBFFDEEBBBDDDCCCDCCBCCDEECDDBDDBBBHGDCOCBSCBDDCEEC4BCBFBDDDBCCFICBjCBDZBiGCCEEEBBBTccBhBBCBBECBCWCBDBCGDB0B0BBuBBCgBCK0BCDMCBgDCxBoBBo6CqBBDCB5XFBjkCIBC2D2DBqBBgCMBChBBnD0ECBHBCgDCBHBJFBLHBJHBJFBLHBJHBJNBDHBJHBJHBJEBCBBHEEBBBCBBJDBDBBJHBLCBCBBzIEEBEEcKFDBBJDBF2B2Bs1CvBBCEEBGCFCCBCCBEBGiDCBIICFFNlBBCGG0oesBCUaCoEMCBBBC+BCBGBCCCDICFCCDCCBBBCSCGGGCMCFCCDOCbEE2ZqBBGIBIvCBh6TGBNEBqhBZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBnqZZBbGBCRBbZBbDBCCCBFBCKBbZBbZBbZBbZBbZBbZBbZBbZBbbBdYBCFBbYBCFBbYBCFBbYBCFBbYBCFBC15B15BBIBCTBHFB4vChBB",!1)),Lm:()=>new g(E("wVRBFLBPEBICCmEGG-OnHnHlFBBuIBBFgBgBKEEhFoFoF1mBgEgE2R72B72BsDkTkTxOFBvF+BBOjBjBBjBByVOORMBg-CBByHgGgG2OsBsBBDBGiDiDB+C+CBBB34bjnBjnBBEBvIzDzDdBB6DIBxCYYpDDBEBB2OXXqEtDtDWBBoDDBKngVngVuBBBh-BFBCpBBCIB0sBhBhB2K04D04DnrTDB9PCBpBBBnRMBhCBBCPPB9-P9-PBCBCGBCBByhM9BBqGGBud0Q0QsSAB",!1)),Lo:()=>new g(E("qFQQhIFFBCBxGBB7ZaBFDBuBfBCJBkBBBCiDBCZZBLLBBBDRRCdBe4CBMZZBfBWVBrBYBIKBGXBCGBRoBB8B1BBETTIJBROBFHBDBBDVBCGBCEEBCBERROBBCCBPBBLJJBEBFBBDVBCGBCBBCBBCBBgBDBCUUBBBRIBCCBCVBCGBCBBCEBETTQBBYMMBGBDBBDVBCGBCBBCEBEffBCCBBBQSSCFBECBCDBEBBCCCBEEBEEBBBELBX1B1BBGBCCBCWBCPBEbbBBBCBBDBBfFFBGBCCBCWBCJBCEBEffBBBCBBQBBSIBCCBCoBBDRRGCBJCBZFBGRBEXBCIBCDDBFB7BvBBCBBNFB8BBBCCCBDBCXBCCCBIBCBBKDDBDBYDBhBgCgCBGBCjBBcEB0DqBBVRRBEBFDBEEEBIIBBBFMBNyDyDBnKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPByDrTBDQBCZBGqCBHHBIRBOSBPRBPMBCCBQzBBpBkCkCBhBBC0BBIEBDhBBCGGBkCBLeByBdBDEBMrBBFZB3BWBK0BBxFuBBSHB3BdBOBBLrBBbjBBqBCBLdByDDBCFBCBBE7hB7hBBCB4-C3BBZWBKGBCGBCGBCGBCGBCGBCGBCGBoR2B2BF1CBJCCB4CBFGGBpBBC9CBSfBxBPBhQ-tGBhC0wUBC2jBBkCnBBJrIBFPBLBBjCyByBBkCBqFoDoDEGBCCBCDBCWBezBBPxBB-BFBECCBMMBaBLWBacBIuBBuBEBDIBLEBCoBBYCBCHBVPBCFBEEEBwBBCEEBDDBDBDCCZBBEKBIPPBEBDFBDFBKGBCGByEiBBej9KBNWBFwBBloItLBDpDBkCCCBIBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBqDJBCsBBDeBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmMcBEwBBwBfBOTBCHBHlBBLdBDjBBFHBhEtCBjDnBBJzBB9CzBBN2JBKVBLHB5EFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCQQBCBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4FjBBnBDBCxJxJBoBBHBBRCBCBB5BcBLJJBUBrBRBvBUBcWBN0BB6BBBDOOBrBBhBYBbjBBeDDJiBBENNBuBBPDBWCCkBRBCYBUBBgCGBCCCBCBCOBCJBIuBBnBHBDBBDVBCGBCBBCEBETTNEBfJBCDDClBBCaaCtBtBBzBBTDBVCBfvBBVBBC5F5FBtBBqBDBlBvBBV8B8BBpBBOoCoCBZBmBGB6FrBB0GHBDDDBGBCBBCXBQCC-CHBDmBBRCCdLLBmBBIWWMtBBUTTBnCBoGgBBgBIBCkBBSyByBBcBxDGBCBBClBBWaaBEBCBBCfBPYYBnBBCBBlISBQCCBLBChBB9DwCwCB4cBnHjGBtyCgDBQvhBBSFBa68DBGmSB61GdBj3B4RBIeBSuCBSdBTvBB0BUBGSB0NnBB2MqCBGwFwFB0mHBqBfBiDyDBuwIiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBxzI2P2PBrBBiBiKiKBcBTrBBlPaBmHdBDwGwGBdBCCBCBBCGBDEBKiHiHBFBCDBCBBCOBCkGB8pBDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQBlqE-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Lt:()=>new g(E("lOGDnB2sH2sHBGBJHBJHBNQQwBAB",!1)),Lu:()=>new g(E("hCZBmDWBCGBiB2BCDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIJDCMCDQCDDDCCBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBDDBBBEWCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBpCDBNDBNDBNEBMDBnIFFECBDCBDEEBDBHGCBCBDDBLBBG+B+B9zCvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoqZZBbZBbZBbCCBGDBDDBCBCHBbZBbBBCDBDHBCGBcBBCDBCEBCEEBFBcZBbZBbZBbZBbZBbZBfYBiBYBiBYBiBYBiBYBiB2pE2pEBgBB",!1)),M:()=>new g(E("gYvDB0IGBoIsBBCCCBCCBCCpCKBxBUBRmDmDBFBDFBDBBCDBkBffBZB8CKB7BIBKZZBCBCIBCCBCEBsBCB8BIBrBXBCgBB3BCBCRBCGBLBBeCB5BCCBFBDBBDCBKLLBbbDCB5BCCBDBFBBDCBEffBEEMCB5BCCBGBCCBCCBVBBXFBCCB5BCCBFBDBBDCBICBLBBf8B8BBDBECBCDBKpBpBBDB4BCCBFBCCBCDBIBBMBBeCB5BCCBFBCCBCDBIBBMBBQNNBCB4BBBCGBCCBCDBKLLBeeBBBnCFFBEBCCCBGBTBB+BDDBFBNHBjDDDBHBMGBqCBBcECFBByBTBCBBGKBCjBBKlDlDBSBYDBFCBCCBDGBEDBOLBCLLBCBgWCBzdDBdCBeBBfBBhCfBKuBuBBBBC2D2DBjBjB3DLBFLB8GEB6BJBCcBDxBxBBsBBDLBVEBwBQBnBIBNCBfMB5BNBxBTB5ECBCUBFHHDCBnG-BBxWgBB--CCBuEhDhDBeBrRFBqDBB1udDBCJBhBBBxCBBxIEEFYYBDBF0C0CBzBzBBQBbRBOnBnBBGBaMBtBDBwBNBlBkCkCBMBNJJBuBuBBBBzBCCBBBDBBGBBCqBqBBDBGBBtHHBCBBx5TiXiXBOBRPBuejHjH2EEBn0BCBCBBGDBpBCBFmFmFB+R+RBCBiCEB+JBBuCFBnCKByBDB7DCB2BOBqBDDBLLBCBuBKBI+B+BBBBlBNBRBBtBNNBBBxBNBJDBCBB9CLBHDD+ELBWDB4BBBCGBDBBDCBKLLBDDBFBEEBkCIBCDDCDBCEBCPPBzCzCBQBYyCyCBSBsHGBDIBcBBzCQBrDMBmDOBhIOB2HFBCBBDDBCCCBuEuEBFBDGBEddBIBpBGBCDBJKKBJBvBPBnGHBoGHBCHBzCVBCNB7DFBECCBCCBFBCjCjCBDBCBBCEB8KDBKBBCxBxBBFBEEBYmnFmnFHOBpmLRBhuCEB8BGB5gBCCB1BBIDByCMMBslTslTBizEizEBsBBDWB-QEBEFBJHBDGBfDB1ECB89B2BBFxBBJPPXEBCOBxqBGBCQBDGBCBBCEBlDhFhFBFB4L+B+BBCB9PDB-HBB0HDDIBBG7O7OBFBuDGB29lYvHB",!1)),Mc:()=>new g(E("joC4B4BDCBJDBCBBzBBB7BCBHBBDBBLsBsB7BCBjC7B7BBBBJCCB2B2BB7B7BCHHBDDBLLnDBBCBBECBCCBLqBqBBBB+BDB+BBB7BCCBDBDBBCBBKBBdPPB7B7BBBBGCBCCBLrBrBBsCsCBBBHHBTBBrKBBgCsFsFBFFHDDBaaBLLBBBDGBWBBDFBDLLBBB5zBffiEIIBGBCBB7KDBDCBFBBCFBhHBB7BCCKCCBJJBEByExBxBGCCBDBCBB+BffFBBD9B9BDCBCEEBxBxBBGBJBBsFWW35EBB0-dBBD5C5CBzBzBBOBvEBBwBxBxBBFFBDDBBBvDBBDBBZuBuBCuDuDDBBGuHuHBCCBCCBCC0gZCCgEuBuBBBBFBB0DZZB8B8BxBCBKBBO+C+CBBBEBBCrFrFBBBgBBB7BBBCDBDBBDCBKLLB1C1CBBBIDDCDBCBBCmDmDBBBJBBErDrDBBBHCCBCBDuHuHBBBHDBDyDyDBBBJBBCuDuDCBBHoDoDCBBFmImIBBBK4H4HBEBCBBFDDCvEvEBBBJDBF1C1CeBB-BqGqGECCoGPPrDIID2G2GBDBFBBC-K-KBNNxBBBJBBCpvQpvQBBBlxD2BBpDBB0rYBBHFB",!1)),Me:()=>new g(E("okBBB1xF-wB-wBBCBCCBsshBCB",!1)),Mn:()=>new g(E("gYvDB0IEBqIsBBCCCBCCBCCpCKBxBUBRmDmDBFBDFBDBBCDBkBffBZB8CKB7BIBKZZBCBCIBCCBCEBsBCB8BIBrBXBCfB4BCCFHBFEEBFBLBBe7B7BFDBJVVBbbDBB6BFFBFFBDDBBBEffBEEMBB6BFFBDBCBBFVVBXXBEBC7B7BDCCBCBJIIBMMBff+BNNzBEE4BCCBBBGCBCDBIBBMBBe7B7BDHHGBBVBBdBB6BBBFDBJVVBeepCIIBBBC7C7CDGBNHBjDDDBHBMGBqCBBcEC4BNBCEBCBBGKBCjBBKnDnDBCBCFBCBBDBBaBBFCBRDBODDBHHQgWgWBBBzdCBeBBfBBfBBhCBBCGBJDDBJBKuBuBBBBC2D2DBjBjB3DCBFBBKHHBBB8GBBD7B7BCGBCCCDHBHJBDxBxBBMBCeBDLBVDBxBCCBDBCGGpBIBNBBhBDBDBBCCB5BCCBEECCB7BHBDBB5ECBCMBCGBFHHEBBnG-BBxWMBFEEBKB--CCBuEhDhDBeBrRDBsDBB1udFFBIBhBBBxCBBxIEEFaaBGG4EBBbRBOnBnBBGBaKBvBCBxBDDBCBDBBoBkCkCBEBDBBDBBNJJwB0B0BCCBDBBGBBCrBrBBJJvHDDFx5Tx5TiXPBRPBuejHjH2EEBn0BCBCBBGDBpBCBFmFmFB+R+RBCBiCEB+JBBuCFBnCKByBDB8D3B3BBNBqBDDBLLBBByBDBDBBI+B+BBBBlBEBCHB-BNNB1B1BBHBLDBDgDgDBBBDCCBHHD+E+EEHBWBB6BBBEmBmBBFBEEBnCFBOECPBB2CHBDCBCYY1CFBCFFBCCBvHvHBCBHBBCBBcBB2CHBDCCBrDrDCDDBEBCmDmDCDDBCBCEBkIIBCBBhIBBCFFxEDBDBBFhBhBBIBpBFBDDBJKKBEBDCBvBMBCBBnGCCBBBCqGqGBFBCFBCzCzCBUBDGBCBBCBB7DFBECCBCCBFBCpCpCBEEC8K8KBMMB1B1BBDBGCCYmnFmnFHOBpmLLBECBhuCEB8BGB5gBgCgCBCByC5lT5lTBizEizEBsBBDWBhRCBSHBDGBfDB1ECB89B2BBFxBBJPPXEBCOBxqBGBCQBDGBCBBCEBlDhFhFBFB4L+B+BBCB9PDB-HBB0HDDIBBG7O7OBFBuDGB29lYvHB",!1)),N:()=>new g(E("wBJB5DBBGDDBBBitBJBnEJBnGJB9MJB3DJBFFBtDJB3DJB3DJBDFBvDMB0DJBJGBoDJBpDGBISBuDJBhDJB3DJBnCTBtIJBnCJBwWTBybCBwHJBHJBXJBtJJBhEKBmFJBHJB3FJB3CJBnEJBHJB3gBEEBEBHJBnGyBBDEB3W7BBvCVB3TdBqrBqYqYaIBPCB4KDBrEJBfHBCOBhBJBoBOBh7cJB9FJBhKFB7EJBnBJBnGJBXJB3CJB3MJB34UJBuPsBBN4BBSBB2KaBlBDBeJJnEEBrGJBvdHBaGBoBIBsCEBXFBhFBBDPBDtBBhCIB1BBBfCBsCEBpDHBZHBqBGBrKFBxBJBHJB3IeB-EJBrBDBxDGBnEdBhEJB9BJBxEJBITB8HJB3KJB3DJB3LJBnDJBHTBtCLBlNSB+CJB3UJB3CcBkHJBnCJB3BJBnLJBnDUBshBuDBimPJBnpCJB3CJBnEJBCGBvQJBnIWB+KCB6nXJBnuBTBNTBtDYB2iBxBBhqCJBnNJB3PJB4HJBtWIBhEJB4Y6BBCCBCDBtCsBBCOBjeMBk3CJB",!1)),Nd:()=>new g(E("wBJnxBJnEJnGJ9MJ3DJ3DJ3DJ3DJ3DJ3DJ3DJ3DJ3DJhDJ3DJnCJ3IJnCJn6BJnBJtJJhEJnFJHJ3FJ3CJnEJHJnuiBJnVJnBJnGJXJ3CJ3MJ34UJnsBJnkCJHJ9YJhEJ9BJxEJ3IJ3KJ3DJ3LJnDJHTtCJnNJnDJ3UJ3CJ3HJnCJ3BJnLJ3uQJnpCJ3CJnEJ3QJ37XJ12CxBhqCJnNJ3PJ4HJ2aJ30EJ",!0)),Nl:()=>new g(E("u3FCBwzCiBBDDB-zDaaBHBPCBs1dJBxyW0BBtOJJnEEBrhIuDBm8SCB",!1)),No:()=>new g(E("yFBBGDDBBB2pCFB5LFB5DCBmEGB6GGBSIByNJB2hBTB0jBJBhP20B20BEFBHJBnGPBqB3W3WB6BBvCVB3TdBqrB1kB1kBBCBrEJBfHBCOBhBJBoBOBxrdFBymWsBBiCDBSBB2KaBlBDB1pBHBaGBoBIBsCEBXFBhFBBDPBDtBBhCIB1BBBfCBsCEBpDHBZHBqBGBrKFBhLeB-EJBrBDBxDGBnETB8LTBmqBBBvNIBobSB0aUBn8SGB-YWBqhZTBNTBtDYBvqFIBid6BBCCBCDBtCsBBCOBjeMB",!1)),P:()=>new g(E("hBCBCFBCDBLBBEBBbCBCccCkBkBGEELBBEEE-VJJzOFBqBBB0BCCDDDtBBBVBBCBBOCCBBBrCDBnDsBsBBMBqHCB3BOBgBmImIBLLtE5D5D6DnMnMNwLwL7CLLBpFpFBNBCmBmBBCBoCrCrCBDBFBBwDFBsFlTlTBHB4EuTuTtBBBvCCBoCBB+ECBCCBmBKB6JBB5GBBhEGBCFBhFBBLGBdCB9DDB8BEB-BBBhCHBM9Z9ZBWBJTBCMBCLBfBBPBB6TDBeBB+hBNBwCBBgBJB0MVBgCDBhBBB8XDBCBBxDwEwEBtBBCfBDLBkNCBFJBDLBRNNjD7C7CjgdBBuICBkDLL0DFB9LDB3CBBpBCBCyByBBwBwBiDMBRBB9DDB-DBBRBB6HzqUzqUBxGxGBIBXiBBCNBCFFCBB2ECBCFBCDBLBBEBBbCBCccCCCBFB7MCB9UxBxB-MoXoXoGgBgBxIIBnBxDxDBFBjCGB6CDByO-J-JjBlElEBDBtBDB+FGBuDBBCDB-DDBxBBBwCDBFOOCCB5CFBsDrJrJBCCBzDzDBDBLBBCpDpD7HWBqDCBdMBtCjEjEBBB9HpIpIBBB8E9C9CBGB0CCBCEB+CJB4GgDgDBDBrBBBmUBBrCMBwFxjBxjBBDB97CBB8zOBBmEiCiCBDBJpRpRBBBoJDBoK9lT9lTovHEB07C-a-aBAB",!1)),Pc:()=>new g(E("-Cg-Hg-HBUU-u3BBBZCBwHAB",!1)),Pd:()=>new g(E("tB9qB9qB0BiyDiyDmgBqgCqgCBEBiwDDDgBBBFdd-NUUwDxszBxszBBmBmBLqFqFhzD-J-J",!1)),Pe:()=>new g(E("pB0B0BgB+1D+1DC-6B-6BqtC4B4BQ7T7TCff-hBMCxChBhBCGC1MUChCCCiBmhBmhBCECtBGCtNICEGCDBB-ozB6G6GeOCESSCCCrF0B0BgBGD",!1)),Pf:()=>new g(E("7F+6H+6HEddpuDCCFDDQEE",!1)),Pi:()=>new g(E("rFt7Ht7HDBBDaapuDCCFDDQEE",!1)),Po:()=>new g(E("hBCBCCBDECBLLBEEBcclCGGPBBI-V-VJzOzOBEBqB3B3BDDDtBBBVBBCBBOCCBBBrCDBnDsBsBBMBqHCB3BOBgBmImIBLLtE5D5D6DnMnMNwLwL7CLLBpFpFBNBCxDxDrCEBFBBwDFBsFlTlTBHBmY9D9DBBBoCBB+ECBCCBmBFBCDB6JBB5GBBhEGBCFBhFBBLGBdCB9DDB8BEB-BBBhCHBMjajaBJJBGBJIBDDBDCBEKBCCCBIB7kDDBCBBxDwEwEBFFBBBDDDBHBCBBCDDBLLBDBCJBDDBCCCBLBDCBtNCB6B+F+FjgdBBuICBkDLL0DFB9LDB3CBBpBCBCyByBBwBwBiDMBRBB9DDB-DBBRBB6HlxUlxUBFBDXXVBBDDBECBCDBICBHCCB2E2EBBBCCBDECBLLBEEBcclBDDB7M7MBBB9UxBxB-MoXoXoGgBgBxIIBnBxDxDBFBjCGB6CDB0ZlElEBDBtBDB+FGBuDBBCDB-DDBxBBBwCDBFOOCCB5CFBsDrJrJBCCBzDzDBDBLBBCpDpD7HWBqDCBdMBtCjEjEBBB9HpIpIBBB8E9C9CBGB0CCBCEB+CJB4GgDgDBDBrBBBmUBBrCMBwFxjBxjBBDB97CBB8zOBBmEiCiCBDBJpRpRBBBoJDBoK9lT9lTovHEB07C-a-aBAB",!1)),Ps:()=>new g(E("oBzBzBgB-1D-1DC-6B-6B-rCEEnB4B4BQ7T7TCff-hBMCxChBhBCGC1MUChCCCiBmhBmhBCECaTTCECtNICEGCDipzBipzB4GeeCMCESSCCCrFzBzBgBEEDAB",!1)),S:()=>new g(E("kBHHRCBgBCCcCCkBEBCBBDCCBCBDEEfgBgBrODBNNBGGBCCCBPB2DPPBxDxDsErIrIBBB3DCBDDDBvGvGLUUB4H4HIBBpEqLqLBHHB2H2H-DjEjEBGBlEwGwGqBmGmGiGCBQCCBBBDFBVECmEHBCFBCBBGDBmGBBxXJB0WuLuLlL+E+EBgBBiLJBKIBhiBCCBBBMCBOCBOCBOBBmCOOoBCBOCBUhBB-BBBCDBCBBLCCBBBGFBCECFMMBFFBDBGDBC7B7BBFFB2LBFcBD+HBXKByCtCBXnTBtBwBBDeBLyMBX+BBFfBD1LBDpEBmHFBmLBBvBZBC4CBN1GBbPBFOOBNNWBBHBB8CBB0HBBFJBhBlBBKRRBdBMdBJQQBeBLmBBQ-JBhuG-BBx0V2BB6RWBKBBoDBB+EDBLDB+RCBiHPPB+9T+9TpEgBBuLPBhCBB3BHBtBDBjDCCBBBD7E7EHRRBBBgBCCcCCiEGBCGBOBB6JIB6BQBDCBCMBEwBwBBrBB7zBBBwSmWmWBiKiKBGBnjC2kC2kCBbBr6SDBG3qU3qUk7DvHBLCBEzNBHWBQQBgDzDB9B1HBLmBBD7BBGCBXBBIdBF8BBWhCBE7F7FB1CBrbaagBaagBaagBaagBaa9B-PB4BDBzBHBCNBCBBp2BwNwNttCEE+DiOiOBvIvIBqBBFjDBNOBDOBCOBCkBBYgFB5BcBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBC7CBLAB",!1)),Sc:()=>new g(E("kB+D+DBCBqnB8D8DzPBBzPBBI2H2HoImSmS8sClmClmCBgBB37hBkuVkuVtD7E7E8GBBEBB3-HDB-4wBxtCxtC",!1)),Sk:()=>new g(E("+CCCoCHHFEEqQDBNNBGGBCCCBPB2DPPBjoBjoB15FCCBBBMCBOCBOCBOBB9kEBBkzdWBKBBoDBBxePPBniUniUBPB8bCCjF4g9B4g9BBDB",!1)),Sm:()=>new g(E("rBRRBBB+BCCuBFFmBgBgB-XwQwQBBB8xGOOoBCBOCBsEoBoBBDBHlClCBDBGBBFGDIgBgBBDDCgBgBBqIBhBBB7CffBXBpBFB2OKK3BHBwDxKxKBDBDeBLPBhIiEBX+BBFfBDhIBxBUBDFB9+zB5Z5ZCCBlFRRBBB+BCCkEHHBCBitDBBhrwBx+Bx+BagBgBagBgBagBgBagBgBat5Ft5FB-uC-uCBHB",!1)),So:()=>new g(E("mFDDFCCyerIrIBgEgEBvGvGLUUB4H4HkQ2L2LjEFBClElEwGqBqBoMCBQCCBBBDFBVECmEHBCFBCBBGDBmGBBxXJB0WzWzW+EhBBiLJBKIBksBBBCDBCBBLCCBHHBEBCECFMMBPPCBBC7B7BBKKBDBDDBCBBCBBCGBCeBDBBCCCBdBtIHBFTBDGBDwCBCdBanBBHnCBXKByCtCBX2FBCIBC1BBJuDBC3HBtBrBBhC-HBhQvBBWBBHmBBDpEBmHFBmLBBvBZBC4CBN1GBbPBFOOBNNWBBHBBxKBBFJBhBlBBKRRBdBMdBJQQBeBLmBBQ-JBhuG-BBx0V2BBibDBLBBC+R+RBBBqqUPBuLPBhCBB3BHBuBCBlPEEFBBOBB6JIB6BQBDCBCMBEwBwBBrBB7zBBBwSpgBpgBBGBnjC2kC2kCBGBFQBr6SDBG3qU3qUk7DvHBLCBEzNBHWBQPBhDzDB9B1HBLmBBD7BBGCBXBBIdBF8BBWhCBE7F7FB1CBqlB-PB4BDBzBHBCNBCBBp2B96C96CiEyWyWBqBBFjDBNOBDOBCOBCkBBYgFB5BcBOrBBFIBIBBPFB7E6HBG4WBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBB-B3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBC7CBLAB",!1)),Z:()=>new g(E("gBgEgEgvFgsCgsCBJBeBBGwBwBh9DAB",!1)),Zl:()=>new g(E("ohIA",!0)),Zp:()=>new g(E("phIA",!0)),Zs:()=>new g(E("gBgEgEgvFgsCgsCBJBlBwBwBh9DAB",!1)),ASCII_Hex_Digit:()=>new g(E("wBJIFbF",!0)),Alphabetic:()=>new g(E("hCZBHZBwBLLFGGBVBCeBCpOBFLBPEBICC3CeeBQBCBBDDBCHHCCBCCCBSBCyCBCqEBJlFBClBBDHHBnBBoBNBCCCBCCBCCJaBFDBeKBG3BBCGBPlDBCHBFHBFCBLCBDRRBuBBOkDBZgBBKBBFGGBWBDSBUYBIKBGXBCGBIJJBoBBLLBEGBHrCBCPBCCBFOBOSBCHBDBBDVBCGBCEEBCBEHBDBBDBBCJJFBBCEBNBBLFFBBBCFBFBBDVBCGBCBBCBBCBBFEBFBBDBBFIIBCBCSSBEBMCBCIBCCBCVBCGBCBBCEBEIBCCBCBBEQQBCBWDBFCBCHBDBBDVBCGBCBBCEBEHBDBBDBBKBBFBBCEBORRBCCBEBECBCDBEBBCCCBEEBEEBBBELBFEBECBCCBEHHpBMBCCBCWBCPBEHBCCBCCBJBBCCBCBBDDBdDBCHBCCBCWBCJBCEBEHBCCBCCBJBBGCBCDBOCBNMBCCBCoBBDHBCCBCCBCGGBCBIEBXFBCCBCRBEXBCIBCDDBFBJFBCCCBGBTBBO5BBGGBH0B0BBECBDBCXBCCCBRBCCBDEBCHHPDBhBgCgCBGBCjBBFSBFPBCjBBkC2BBCDDBDBR-BBLDBDlBBCGGDqBBCsKBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBmBPBR1CBDFBErTBDQBCZBGqCBEKBITBMUBNTBNMBCCBCBBNzBBDSBPFFkC4CBIqBBGlCBLeBCLBFIBYdBDEBMrBBFZB3BbBF+BBDTBzBYYBMMBBByBzBBCOBCHB0BpBBDDBLrBBCKBP2BBXCBLjBBDKBGqBBDCBqBDBCFBCBBEGGB+FBUhBBM1IBDFBDlBBDFBDHBCGCBdBD0BBCGBCEEBBBCGBEDBDFBFMBGCBCGB1DOORMBmDFFDJBCEEBDBHGCBCBCKBDDBGEBFSSBnBBuZzBB34BkHBHDBEBBNlBBCGGD3BBIRRBVBKGBCGBCGBCGBCGBCGBCGBCGBCfBwB2O2OBBBaIBIEBDEBF1CBHCBC5CBCDBGqBBC9CBSfBxBPBhQ-tGBhCs0VBkCtBBDsIBEPBLBBVuBBGHBEwDBoBIBDmDBDxCBVUBCgBBZzBBNjCBCtBtBBEBECCBBBLgBBGiBBOcBEyBBCLBQRRBOBLEBC2BBKNBTWBEkCBCCCZCBDPBDDBMFBDFBDFBKGBCGBCqBBCNBH6DBWj9KBNWBFwBBloItLBDpDBnBGBNEBGLBCMBCEBCCCBCCBCCBqDBiBqLBT-BBD1BBpBLB1DEBCmEBlBZBHZBM4CBEFBDFBDFBDCBkBLBCZBCSBCBBCOBDNBjB6DBmC0BBsIcBEwBBwBfBOdBGqBBGdBDjBBFHBCEBrB9EBTjBBFjBBFnBBJzBBNKBCOBCGBCBBCKBCOBCGBCBBEzBBN2JBKVBLHBZFBCpBBCIBmCFBDCCBqBBCBBEDDBVBLWBKeBiCSBCBBLVBLZBHZBnB3BBHBBhCDBCBBGHBCCBCcBrBcBEcBkBHBCbBc1BBLVBLSBORBvDoCB4ByBBOyBBOnBBjBbBEGGBVB7HpBBCBBEBBRFBzBCBEcBLJJBUBrBRBvBUBcWBKlCBsBEBL4BBKOOBXBYyBBSDBJiBBEKKB+BBCDBKBBLCCkBRBChBBDHHBCB-BGBCCCBCBCOBCJBI4BBYDBCHBDBBDVBCGBCBBCEBEHBDBBDBBEHHGGBdJBCDDClBBCJBCDDCDBCBBECCtBhCBCCBCDBVCBfhCBDBBC5F5FB0BBDGBaFBjB+BBCEE8B1BBDoCoCBZBDNBWGB6F4BBoD-BBgBHBDDDBGBCBBCdBCBBDBBDDB+CHBDtBBDFBCCCBccBxBBDJBSnCBGTTBnCBoDHB5CgBBgBIBCsBBCGBCyByBBcBDVBCNBqCGBCBBCrBBECCBCCBBBCDDBZZBEBCBBCkBBCBBCDBCYYBqBBlIWBKQBCoBBECBwDwCwCB4cBnDuDBSjGBtyCgDBQvhBBSFBa68DBGmSB61GuBBy2B4RBIeBSuCBSdBTvBBRDBgBUBGSBxNsBB0G-BBhBYBDYBtBqCBF4BBIQBhCBBCNNBFBK1mHBqBfBiDyDB+vIDBCGBCBBCiJBQeeBBBDPPBCBJrMBloCqDBGMBEIBIJBFi7Fi7FBzCBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDYBCYBCeBCYBCeBCYBCeBCYBCeBCYBCHB15BeBHFB2GGBCQBDGBCBBCEBG9BBiBxDxDBrBBLGBRiKiKBcBTrBBlPbBlHdBDwGwGBdBCVBJBBhHGBCDBCBBCOBCkGB8BjCBEEE1lBDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1TZBHZBHZB3zD-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Dash:()=>new g(E("tB9qB9qB0BiyDiyDmgBqgCqgCBEB+BoBoBQnMnMlgDDDgBBBFdd-NUUwDxszBxszBBmBmBLqFqFhzD-J-J",!1)),Emoji:()=>new g(E("jBHHGJBwDFFu8HNN5GXX7CFBQBBwLBBNnFnFaKBFCBoGoHoHBLLK7B7BBCBCEBKGDBDDFDDCBBDIEBJJBBBGCCGLBMBBDCCBCCTDDBTTBEBCCCBEEBGGDBBFBBMBBGBBDGGBECBVVBGGBEBCDBDFFDDDBEBCDDCCCHEEHLLBQQDFFCFFBBBCMMBxBxBBBBKeP1LBBwOCBUBB0BFF7mBNN6SCCrrvDrGrGhFBBNBBPDDBIBsCZBCBBYVVDIBWBBvFhBBDvDBDBBCCBDyCBDCBCmIBC+BBMFBCXBIBBDHBNDDBCBDFFBOOBDDJBBKGGBBBNCBJCBDCCFHHEHHB0CBxBlCBGHBDDBEJBECCBEEDJBkHLBF8I8IBtBBCJBC4FBxDMBEKBE4BBCFFBOBDLBFJB",!1)),Emoji_Component:()=>new g(E("jBHHGJB0+H2G2Gsp3B3+8B3+8BBYB8PEBxtBDBtzhY-CB",!1)),Emoji_Modifier:()=>new g(E("7-8DE",!0)),Emoji_Modifier_Base:()=>new g(E("9wJ8G8GRDB4jzD9B9BBBBDDDBBB2DBBDKBWSBEFFBBBCCBICCZqGqGBFFWFFBvFvFBBBEEB0CRRBBBKMMgSDDJHBHKKBIBDCB5B+B+BBCCBCCSCBCMBmHCBrBIB",!1)),Emoji_Presentation:()=>new g(E("64IBBuGDBEDDqQBBWBBzBLBsBUUOJJBSSBGGBJJGWWIBBCFFDIIFBBdkBkBCFFBBBC+B+BBBBZPP8aBB0BFFvlxDrGrG-FDDBIBsCZBCZZVDDBDBCCBWBBvFgBBNIBClCBCVBNqBBFEBNQBEEEBlCBCCCB5FBD+BBODBCXBTbbBOO3C0CBxBlCBHEEBBBDDBEDBMBBIIBkHLBF8I8IBtBBCJBC4FBxDMBEKBE4BBCFFBOBDLBFJB",!1)),Extended_Pictographic:()=>new g(E("pFFFu8HNN5GXX7CFBQBBwLBBNnFnFaKBFCBoGoHoHBLLK7B7BBCBCEBKGDBDDFDDCBBDIEBJJBBBGCCGLBMBBDCCBCCTDDBTTBEBCCCBEEBGGDBBFBBMBBGBBDGGBECBVVBGGBEBCDBDFFDDDBEBCDDCCCHEEHLLBQQDFFCFFBBBCMMBxBxBBBBKeP1LBBwOCBUBB0BFF7mBNN6SCCrrvDoBoBBCBlDLBQBBQPPBmBmBBIBxDBBNBBPDDBIBU3BBcOBLVVDIBCDBKWBH7FBDvDBDBBCCBDyCBDCBCDBG9HBC+BBMFBCXBIBBDHBNDDBCBDFFBOOBDDJBBKGGBBBNCBJCBDCCFHHEHHB0CBxBlCBGHBDQBECCBEBDMB7GlBBNDB5BHBLFBpBHBfBBNDBDNBKmBBNuBBCJBC4FB5CHBPxEBhI9fB",!1)),Hex_Digit:()=>new g(E("wBJIFbFq1-BJIFbF",!0)),Lowercase:()=>new g(E("hDZBwBLLFlBlBBWBCHBC2BCBQCBuBCDECBBBDCCDEEBFFDEEBBBDDDCCCDCCBCCDEECDDBDDBBBHGDCOCBSCBDDCEEC4BCBFBDDDBCCFICBjCBDiBBIBBfEBhDsBsBCEEDDBTccBhBBCBBECBCWCBDBCGDB0B0BBuBBCgBCK0BCDMCBgDCxBoBBo6CqBBCDB5XFBjkCIBC2D2DB+FBiC0ECBHBCgDCBHBJFBLHBJHBJFBLHBJHBJNBDHBJHBJHBJEBCBBHEEBBBCBBJDBDBBJHBLCBCBB6DOORMBuDEEBEEcKFDBBJDBFiBiBBOBFsasaBYBn6BvBBCEEBGCFCCBCCBGBEiDCBIICFFNlBBCGG0oesBCUaCBBBmEMCBBBC8BCBIBCCCDICFCCDCCBBBCSCGGGCMCFCCDOCWDBCCCBBB2ZqBBCNBHvCBh6TGBNEBqhBZBumBnBBpEjBB8EKBCOBCGBCBBkODDBBBCpBBCIBmoByBB+DVB75CfBhsVfB8BYBnqZZBbGBCRBbZBbDBCCCBFBCKBbZBbZBbZBbZBbZBbZBbZBbZBbbBdYBCFBbYBCFBbYBCFBbYBCFBbYBCFBC15B15BBIBCTBHFBmI9BB1lChBB",!1)),Math:()=>new g(E("rBRRBBBgBeeCuBuBFmBmBgB5W5WBBBDbbBDDBBBwQCBuwGccBBBMEEOPPBCBWEBMEBiCMBFEEBFFBDBTFFDJBCDDBEBHEEBDDBCCBBBCFBENBClClCBWBCFBCBBFBBFfBCHHBPPBqIBJDBVBB7CffBZBCZZMGB+NBBNJBFFBFBBDBBEEBPCCDFBMHBGBB6BCCeDBKCBxK-BBhI-PBxBUBDFB9+zB4Z4ZBEBCjFjFRCBeCCeCCkEHHBCBitDBBhrwBwoBwoBBzCBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBDxBBhwFDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBB-uCIB",!1)),Quotation_Mark:()=>new g(E("iBFFkEQQ96HHBaBBowDqOqOBCBOCBixzBDB+FFF7CBB",!1)),Terminal_Punctuation:()=>new g(E("hBLLCMMBEE-ZJJiQ6B6BpCPPCCB1FsBsBBJBCsHsHB3B3BBEBCHBgBmImIB1nB1nBBtFtFFFB4JBB2YHBmY9D9DBBBoCBB+ECBEoBoBBCBDBB7JBBjLDBjFBBLBBCCBeCB8FEB-BBBldYYBKKBBBwlDCBzJOOFLLCBBEBBtNBB8ndBBuICBkHEB-LBB3CBBgD4E4EBBB0ECBgERRB6H6HnxUDDB6B6BBBBCDBqFLLCMMBEEiCDD7hBxBxBnkBoGoG3JBB5EFBlCFB6CDB5dEBtBDB+FGBxDDBgECBiEBBHRRB5C5CBDBtDrJrJB2D2DBBBNBBnLDBEOBqDBB6HCBmQCC8HBB4CBBFBB-MCBuBmUmUBrCrCBspBspBBDB6vRBBmEiCiCBBBLqRqRBoJoJBnwTnwTovHDB",!1)),Uppercase:()=>new g(E("hCZBmDWBCGBiB2BCDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIJDCMCDQCDDDCCBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBDDBBBEWCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBpCDBNDBNDBNEBMDBnIFFECBDCBDEEBDBHGCBCBDDBLBBGbbBOBUzZzZBYBx5BvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoqZZBbZBbZBbCCBGDBDDBCBCHBbZBbBBCDBDHBCGBcBBCDBCEBCEEBFBcZBbZBbZBbZBbZBbZBfYBiBYBiBYBiBYBiBYBiB2pE2pEBgBBvgCZBHZBHZB",!1)),White_Space:()=>new g(E("JEBTlDlDbgvFgvFgsCKBeBBGwBwBh9DAB",!1))});static get Upper(){return this.CATEGORIES.get("Lu")}static SCRIPTS=new na({Adlam:()=>new g(E("go6DrCFJFB",!0)),Ahom:()=>new g(E("g4lCaDOFW",!0)),Anatolian_Hieroglyphs:()=>new g(E("ggxCmS",!0)),Arabic:()=>new g(E("gwBEBCFBCNBCCBCfBCJBMZBCrDBChBBxCvBBxHhBBGqCBCcBxy8BtPBDvEBhBPBxDEBCmEBk7DeBkCFBJIBiBFBh43BDBCaBCBBCDDCJBCDBCCCHFFCECBBBCBBCDDCICBCCDDBCGBCDBCDBCCCBIBCQBGCBCEBCQB1BBB",!1)),Armenian:()=>new g(E("xpBlBDxBDCks9BE",!0)),Avestan:()=>new g(E("g4iC1BEG",!0)),Balinese:()=>new g(E("g4GsCCxB",!0)),Bamum:()=>new g(E("g1pB3CpowB4R",!0)),Bassa_Vah:()=>new g(E("w26CdDF",!0)),Batak:()=>new g(E("g+GzBJD",!0)),Bengali:()=>new g(E("gsCDBCHBDBBDVBCGBCEEBCBDIBDBBDDBJFFBCCBDBDYB",!1)),Beria_Erfe:()=>new g(E("g17CYDY",!0)),Bhaiksuki:()=>new g(E("ggnCICsBCNLc",!0)),Bopomofo:()=>new g(E("qXB6wLqBxDf",!0)),Brahmi:()=>new g(E("ggkCtCFjBKA",!0)),Braille:()=>new g(E("ggK-H",!0)),Buginese:()=>new g(E("gwGbDB",!0)),Buhid:()=>new g(E("g6FT",!0)),Canadian_Aboriginal:()=>new g(E("ggF-TxRlC7tgCP",!0)),Carian:()=>new g(E("g1gCwB",!0)),Caucasian_Albanian:()=>new g(E("wphCzBMA",!0)),Chakma:()=>new g(E("gokC0BCR",!0)),Cham:()=>new g(E("gwqB2BKNDJDD",!0)),Cherokee:()=>new g(E("g9E1CDFz7lBvC",!0)),Chorasmian:()=>new g(E("w9jCb",!0)),Common:()=>new g(E("AgCBbFBbuBBCOBCEBYgBgBiOmBBGEBDTB1DKKHCC+THHPEEhB9E9ElQiEiEB6mB6mB2MDBjJwvBwvBBBBoCBBsGBBCumBumBOIIBCBCFBCCBDmYmYBKBD2CBCKBEKBCOBShBB-BlBBCCBDFBCaBCQBqBCBF5UBXKBW-cBhIzTBDpEBhQ9CBzMUBCCCBXBQHBFDB8CBBE7C7CB0E0EBOBhBlBBKxBxBB+BBgBwCBwB5C5CBmFBhuG-BBhoWhBBnDCBmFJB1HhFhFsMPPBzuUzuUBxGxGBIBXiBBCSBCDB0ECCBeBbFBbKBLuBuBBhChCBFBCGBLEBjICBFsBBEIBxCMB0BsBBlHaBltuBDB96D8HBEzNBHWBQQBgDzDB9B1HBLmBBD9BBEQBJBBIdBF8BB2GTBNTBN2CBKYBoE0CBCmCBCBBDDDBDDBCBCLBCCCBFBCgCBCDBDHBCGBCbBCDBCEBCEEBFBCzKBDjJBDxBByjFjCBtC8BBjWrBBFjDBNOBDOBCOBCkBBLtFB5BZBCBBOrBBFIBIBBPFB7E4eBEQBEMBE5GBHLBFQQBKBF3BBJJBHnBBJdBDLBFBBPIBoB3KBJNBDMBEKBE4BBCFFBOBDLBFJBIyEBCmDBnghYffB+CB",!1)),Coptic:()=>new g(E("ifNxkKzDGG",!0)),Cuneiform:()=>new g(E("ggoC5cnDuDCEMjG",!0)),Cypriot:()=>new g(E("ggiCFBDCCBqBBCBBEDD",!1)),Cypro_Minoan:()=>new g(E("w8rCiD",!0)),Cyrillic:()=>new g(E("ggBkEBDoFBx6FKBhFtCtCojEfBhie-CBv8VBBhw4B9BBiBAB",!1)),Deseret:()=>new g(E("gghCvC",!0)),Devanagari:()=>new g(E("goCwCFODZh7nBfhwcJ",!0)),Dives_Akuru:()=>new g(E("gomCGBDDDBGBCBBCdBCBBDLBKJB",!1)),Dogra:()=>new g(E("ggmC7B",!0)),Duployan:()=>new g(E("ggvDqDGMEIIJDD",!0)),Egyptian_Hieroglyphs:()=>new g(E("ggsC1iBL68D",!0)),Elbasan:()=>new g(E("gohCnB",!0)),Elymaic:()=>new g(E("g-jCW",!0)),Ethiopic:()=>new g(E("gwEoCBCDBDGBCCCBCBDoBBCDBDgBBCDBDGBCCCBCBDOBC4BBCDBDiCBDfBEZBnvGWBKGBCGBCGBCGBCGBCGBCGBCGBjpfFBDFBDFBKGBCGBylvCGBCDBCBBCOB",!1)),Garay:()=>new g(E("gqjClBEcJB",!0)),Georgian:()=>new g(E("glElBBCGGDqBBCDBx8CqBBDCBhiElBBCGG",!1)),Glagolitic:()=>new g(E("ggL-Ch9sDGCQDGCBCE",!0)),Gothic:()=>new g(E("w5gCa",!0)),Grantha:()=>new g(E("g4kCDBCHBDBBDVBCGBCBBCEBDIBDBBDCBDHHGGBDGBEEB",!1)),Greek:()=>new g(E("wbDBCCBDDBCFFCCCBBBCCCBSBC+BBPPBnpGEBzBEBFEB1ChKhKBUBDFBDlBBDFBDHBCGCBdBD0BBCOBCNBDFBCSBDCBCIBoJ-xiB-xiB7uVuCBSgj0Bgj0BBkCB",!1)),Gujarati:()=>new g(E("h0CCBCIBCCBCVBCGBCBBCEBDJBCCBCCBDQQBCBDLBIGB",!1)),Gunjala_Gondi:()=>new g(E("grnCFCBCkBCBCFIJ",!0)),Gurmukhi:()=>new g(E("hwCCBCFBFBBDVBCGBCBBCBBCBBDCCBDBFBBDCBEIIBCBCIIBPB",!1)),Gurung_Khema:()=>new g(E("go4C5B",!0)),Han:()=>new g(E("g0LZBC4CBN1GBwBCCaIBPDBle-tGBhC-vUBhoWtLBDpDBpodBBNGBqgkB-2pBBhB9oEBDt0FBDwpHBQtTBjtC9QBjvBq6EBGppIB",!1)),Hangul:()=>new g(E("goE-HvxHBiI9CyDeiCei3dckUj9KNWFwBl9JeEFDFDFDC",!0)),Hanifi_Rohingya:()=>new g(E("gojCnBJJ",!0)),Hanunoo:()=>new g(E("g5FU",!0)),Hatran:()=>new g(E("gniCSCBGE",!0)),Hebrew:()=>new g(E("xsB2BBJaBFFBpp9BZBCEBCCCBCCBCCBIB",!1)),Hiragana:()=>new g(E("hiM1CBHCBi7-C+IBTeeBBBulQAB",!1)),Imperial_Aramaic:()=>new g(E("giiCVCI",!0)),Inherited:()=>new g(E("gYvDB2IBBlOKBbhXhXBCB8qEtBBDLBlPCBCMBCGBFHHEBBnG-BBtQBBjGgBB65DDBsDBBmrzBPBRNBwejHjH7iEl+uBl+uBBsBBDWBhRCBSHBDGBfDBz6rYvHB",!1)),Inscriptional_Pahlavi:()=>new g(E("g7iCSGH",!0)),Inscriptional_Parthian:()=>new g(E("g6iCVDH",!0)),Javanese:()=>new g(E("gsqBtCDJFB",!0)),Kaithi:()=>new g(E("gkkCiCLA",!0)),Kannada:()=>new g(E("gkDMCCCWCJCEDICCCDIBGCCDDJCC",!0)),Katakana:()=>new g(E("hlM5CBDCBxHPBxGuBBC3CBvgzBJBCsBBzisBDBCGBCBBCgJgJBBBzBPPBCB",!1)),Kawi:()=>new g(E("g4nCQCoBEc",!0)),Kayah_Li:()=>new g(E("goqBtBCA",!0)),Kharoshthi:()=>new g(E("gwiCDCBGHCCCcDCFJII",!0)),Khitan_Small_Script:()=>new g(E("k-7C84G84GB0OBqBAB",!1)),Khmer:()=>new g(E("g8F9CDJHJnPf",!0)),Khojki:()=>new g(E("gwkCRCuB",!0)),Khudawadi:()=>new g(E("w1kC6BGJ",!0)),Kirat_Rai:()=>new g(E("gq7C5B",!0)),Lao:()=>new g(E("h0DBBCCCBDBCXBCCCBVBDEBCCCBFBCJBDDB",!1)),Latin:()=>new g(E("hCZBHZBwBQQGWBCeBCgOBoBEB8wGlBBHwBBGDBGMBClCBiC-HByLOORMBuEBBHccSoBB42CfBj1elDBExCBVOBxZqBBCIBCDB38TGB7gBZBHZBmhCFBCpBBCIBm61BeBHFB",!1)),Lepcha:()=>new g(E("ggH3BEOEC",!0)),Limbu:()=>new g(E("goGeBCLBFLBFEEBKB",!1)),Linear_A:()=>new g(E("gwhC2JKVLH",!0)),Linear_B:()=>new g(E("gggCLCZCSCBCODNjB6D",!0)),Lisu:()=>new g(E("wmpBvBx1eA",!0)),Lycian:()=>new g(E("g0gCc",!0)),Lydian:()=>new g(E("gpiCZGA",!0)),Mahajani:()=>new g(E("wqkCmB",!0)),Makasar:()=>new g(E("g3nCY",!0)),Malayalam:()=>new g(E("goDMCCCyBCCCFFPDZ",!0)),Mandaic:()=>new g(E("giCbDA",!0)),Manichaean:()=>new g(E("g2iCmBFL",!0)),Marchen:()=>new g(E("wjnCfDVCN",!0)),Masaram_Gondi:()=>new g(E("gonCGBCBBCrBBECCBCCBHBJJB",!1)),Medefaidrin:()=>new g(E("gy7C6C",!0)),Meetei_Mayek:()=>new g(E("g3qBWqGtBDJ",!0)),Mende_Kikakui:()=>new g(E("gg6DkGDP",!0)),Meroitic_Cursive:()=>new g(E("gtiCXFTDtB",!0)),Meroitic_Hieroglyphs:()=>new g(E("gsiCf",!0)),Miao:()=>new g(E("g47CqCF4BIQ",!0)),Modi:()=>new g(E("gwlCkCMJ",!0)),Mongolian:()=>new g(E("ggGBBDCCBSBH4CBIqBB2t-BMB",!1)),Mro:()=>new g(E("gy6CeCJFB",!0)),Multani:()=>new g(E("g0kCGBCCCBCBCOBCKB",!1)),Myanmar:()=>new g(E("ggE-EhqmBeiDfxibT",!0)),Nabataean:()=>new g(E("gkiCeJI",!0)),Nag_Mundari:()=>new g(E("wm5DpB",!0)),Nandinagari:()=>new g(E("gtmCHDtBDK",!0)),New_Tai_Lue:()=>new g(E("gsGrBFZHKEB",!0)),Newa:()=>new g(E("gglC7CCE",!0)),Nko:()=>new g(E("g+B6BDC",!0)),Nushu:()=>new g(E("h-7CvsQvsQBqMB",!1)),Nyiakeng_Puachue_Hmong:()=>new g(E("go4DsBENDJFB",!0)),Ogham:()=>new g(E("g0Fc",!0)),Ol_Chiki:()=>new g(E("wiHvB",!0)),Ol_Onal:()=>new g(E("wu5DqBFA",!0)),Old_Hungarian:()=>new g(E("gkjCyBOyBIF",!0)),Old_Italic:()=>new g(E("g4gCjBKC",!0)),Old_North_Arabian:()=>new g(E("g0iCf",!0)),Old_Permic:()=>new g(E("w6gCqB",!0)),Old_Persian:()=>new g(E("g9gCjBFN",!0)),Old_Sogdian:()=>new g(E("g4jCnB",!0)),Old_South_Arabian:()=>new g(E("gziCf",!0)),Old_Turkic:()=>new g(E("ggjCoC",!0)),Old_Uyghur:()=>new g(E("w7jCZ",!0)),Oriya:()=>new g(E("h4CCCHDBDVCGCBCEDIDBDCICFBCEDR",!0)),Osage:()=>new g(E("wlhCjBFjB",!0)),Osmanya:()=>new g(E("gkhCdDJ",!0)),Pahawh_Hmong:()=>new g(E("g46ClCLJCGCUGS",!0)),Palmyrene:()=>new g(E("gjiCf",!0)),Pau_Cin_Hau:()=>new g(E("g2mC4B",!0)),Phags_Pa:()=>new g(E("giqB3B",!0)),Phoenician:()=>new g(E("goiCbEA",!0)),Psalter_Pahlavi:()=>new g(E("g8iCRIDNG",!0)),Rejang:()=>new g(E("wpqBjBMA",!0)),Runic:()=>new g(E("g1FqCEK",!0)),Samaritan:()=>new g(E("ggCtBDO",!0)),Saurashtra:()=>new g(E("gkqBlCJL",!0)),Sharada:()=>new g(E("gskC-ChsCH",!0)),Shavian:()=>new g(E("wihCvB",!0)),Siddham:()=>new g(E("gslC1BDlB",!0)),Sidetic:()=>new g(E("gqiCZ",!0)),SignWriting:()=>new g(E("gg2DrUQECO",!0)),Sinhala:()=>new g(E("hsDCBCRBEXBCIBCDDBFBEFFBEBCCCBGBHJBDCBt-gCTB",!1)),Sogdian:()=>new g(E("w5jCpB",!0)),Sora_Sompeng:()=>new g(E("wmkCYIJ",!0)),Soyombo:()=>new g(E("wymCyC",!0)),Sundanese:()=>new g(E("g8G-BhIH",!0)),Sunuwar:()=>new g(E("g+mChBPJ",!0)),Syloti_Nagri:()=>new g(E("ggqBsB",!0)),Syriac:()=>new g(E("g4BNC7BDCxIK",!0)),Tagalog:()=>new g(E("g4FVKA",!0)),Tagbanwa:()=>new g(E("g7FMCCCB",!0)),Tai_Le:()=>new g(E("wqGdDE",!0)),Tai_Tham:()=>new g(E("gxG+BCcDKHJHN",!0)),Tai_Viet:()=>new g(E("g0qBiCZE",!0)),Tai_Yo:()=>new g(E("g25DeCVJB",!0)),Takri:()=>new g(E("g0lC5BHJ",!0)),Tamil:()=>new g(E("i8CBBCFBECBCDBEBBCCCBEEBEEBBBELBFEBECBCDBDHHPUBm+kCxBBOAB",!1)),Tangsa:()=>new g(E("wz6CuCCJ",!0)),Tangut:()=>new g(E("g-7CgBgBB+3GBhQeBiDyDB",!1)),Telugu:()=>new g(E("ggDMCCCWCPDICCCDIBCCCBDDDJII",!0)),Thaana:()=>new g(E("g8BxB",!0)),Thai:()=>new g(E("hwD5BGb",!0)),Tibetan:()=>new g(E("g4DnCCjBFmBCjBCOCGFB",!0)),Tifinagh:()=>new g(E("wpL3BIBPA",!0)),Tirhuta:()=>new g(E("gklCnCJJ",!0)),Todhri:()=>new g(E("guhCzB",!0)),Tolong_Siki:()=>new g(E("wtnCrBFJ",!0)),Toto:()=>new g(E("w04De",!0)),Tulu_Tigalari:()=>new g(E("g8kCJBCDDClBBCJBCDDCDBCJBCBBJBB",!1)),Ugaritic:()=>new g(E("g8gCdCA",!0)),Unknown:()=>new g(E("4bBBHDBICCVuMuMnBBBzBBBE4B4BBGBcDBHKBvI9B9BBmDmDBMB8BBByBBBQddBCCMEBjBEBuHJJBDDBXXICCBBBFBBKBBDBBFHBCDBDGGBaaBEEHDBDBBXIIDGDBCCGDBDBBECBCGBFCCBFBSJBEKKEXXIDDGBBLIEBCCBNBFBBNGBIEEJBBDBBXIIDGGBKKBDDBEEBFBEDBDGGBTTBIBDHHBBBEFFBBBDCCDCBDCBECBNDBGCBEFFBCCBEBCNBWEBOEEYRRBKKEFFBFBDEEDBBFBBLGBXEEYLLGBBKEEFGBDEBEFFBLLELBOEE0BEEHDBRBBbEETCBZKKCBBICBCDBHCCJFBLBBELB7BDBekBBDCCGZZCYYBGGCIILBBFfBpClBlBBCBoBlBlBQOOBjBBnGCCBDBCBB6LFFBIICFFBqBqBFBBiBFFBIICFFBQQ6BFFBkCkCBhBhBBBBbFB3CBBHBB+UCB6CGBXIBZIBVLBOEEDLB-CBBLFBLFBbFB6CGBsBEBnCJBgBNNBCBNDBCCBrBBBGKBtBDBbFBMCB-BBBiCeeBMMBEBLFBPBBvBBBNTBuCnFnFBGB9BCBQCB-BEBsBBBMHBsBEB3QBBHBBnBBBHBBJGCgBBB2BQQPBBHUUBEEKmDmDNBBcOOBBBjBNBiBOBtEDB7UVBMUB14BBB-LEBuBCCBDBCBB5BGBDNBZIBI4BI-DhBBb6C6CBKB3GZBxC3C3CBoDoDBDBsB-C-C3CIBxBuzcuzcBBB4BIB9KTB5FHB+GTB9BCBLFB5BHBnCHBNFB1DKBfCBvCMMBCBiB4B4BBHBPBBLBBoDXBdJBHBBHBBHIBIII9BDB-DBBLFBl9KLBYDByBjoIBvLBBrDlBBILBGEBbGGCGDrUfBrBFB0BUUFDBGoEoEBCC-FCBHBBHBBHBBECBIIIBIBGBBNbbUDDQBBPhBB8DEBEDBuBCB5COOBBBCuBBvBhEBeCByBOBdDBlBIBfEBsBEBfmBmBBCBPpBB-EBBLFBlBDBlBDBpBHB1BKBNQQIDDMQQIDDBBB1BLB4JIBXJBJXBHrBrBKkCBHBBCtBtBDCBCBBYpCpCBGBKvBBUDDBDBiBCBcEBclBB5BDBVBBzBDDBDBJEEeBBEDBLGBKGBhCfBoBDBNIB3BCBeBBcEBbGBFLBIvCBqC2BB0BMB0BGBvBHBLFBnBCBeHBDvGBgBrBrBEBBDPBHHBKgBBvBHBrBVBblBBdTBYIBvCDBlBIBlCJBCBBaGBLFB2BTTBGBoBIBhDVVBJBTwBwBB8BBICCFQQMFB8BEBLFBFJJBDDBXXIDDGLLBDDBEEBCCBEBCEBIBBICBGKBLCCBCCnBLLCBBCFFLDDBGBDcB9CGGBcBpCHBLlFB3BBBnBhBBmCKBLFBOSB7BFBLFBVbBcBBQDBY4FB9BjDB0CLBJBBCBBJDDfDDBNNBHBLlCBJBBvBBBMaBpCHB0CMBqCGBL1CBJ3CBjBNBLFBKuBuBPJBeCBhBBBXPPBnCBIDDtBCBCDDKHBLFBHDDmBDDHGBLFBtBDBL1HBaGBSqBqBBBBe0CBCOBzBMB8clDBwDGGBJBlGryCBkDMB3iBJB88DEBoS41GB7Bl2BB6RGBgBLLBCByCLLBEBfBBHJBnCJBLIIWEBUvNB7BlGB8CEBaBBarBBsCDB6BGBS-BBGKBIIB3mHoBBhBgDB0D8vIBFIIDkJkJBNBCcBEBBCNBFHBtMjoCBsDEBOCBKGBLBBJ76DB+HCB1NFBYOBSOBvBBBYIB1D7BB3HJBoBBBjGUBnC5DBVLBVLB4CIBamEB2CoCoCDBBCBBDBBFNNCIIiCFFBJJIddFGGCCBI1K1KBlJlJB-V-VBNBGQQBuiBBgBFBH0GBISSBIIDGGBDB-BgBBCvDBuBCBPBBLDBD-JBgBQB7BEBCvOBrB1GBsBDBC-FBgBXXBGBD-GBIFFDQQmGBBRoBBtCDBLDBDwYBlCrCB+BhGBFccDCCBCCLFFCCCBEBCDBCECEDDCBBCICDCCBFFIKFCLLSEBEGGSzBBDtIBtBDBlDLBQBBQQQmBJBvF3BBeMBtBDBKGBDNBH5EB6eCBSCBOCB7GFBNDBCOBNDB5BHBLFBpBHBfBBNDBDNBKmBB5KHBPBBOCBMCB6BCCBCBRBBNDBLGB0EoDoDBjgBBh3pBfB-oEBBv0FBBypHOBvThtCB-QhvBBs6EEBrpIm8yVBCdBhD-DBxHvw-FB",!1)),Vai:()=>new g(E("gopBrJ",!0)),Vithkuqi:()=>new g(E("wrhCKCOCGCBCKCOCGCB",!0)),Wancho:()=>new g(E("g24D5BGA",!0)),Warang_Citi:()=>new g(E("glmCyCNA",!0)),Yezidi:()=>new g(E("g0jCpBCCDB",!0)),Yi:()=>new g(E("ggoBskBE2B",!0)),Zanabazar_Square:()=>new g(E("gwmCnC",!0))});static FOLD_CATEGORIES=new na({L:()=>new g(E("laA",!0)),LC:()=>new g(E("laA",!0)),Ll:()=>new g(E("hCZBmDWBCGBiBuBCEECDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIBBCBBCBBCOCDQCDBBCCCBBBC4BCIBBCBBDCCBCBCGC3HrBrBCEEJHHCCBCCCBCCBPBCIBkBJJCUCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBZHBJHBJHBJEBMEBMDBNEBMEBqJEEBHHxC9zC9zCBuBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoyehBB",!1)),Lt:()=>new g(E("kOCCBCCBCClBCCtsHHBJHBJHBMQQwBAB",!1)),Lu:()=>new g(E("hDZB7BqBqBBWBCHBCuBCEECDOCDsBCDECBBBDCCDEEGDDECBDDDCCCDFFDEECDDECCGBBCBBCBBCOCBSCDBBCEECkBCEQCJDDBCCFICBEBCBBCCCBEEBCCBCBCEBDCCBDDIDDCBBEFBGLLBnFnFsBCCEEEBBBvBDBCdBCBBECBCWCBDBCGD1BvBBCgBCK0BCDMCBgDCyBlBBq6CqBBDCB5XFBjkCIBCvHvHERRzD0ECGGGC8CCBHBJFBLHBJHBJFBMGCJHBJNBzBBBNSSBPPBEEpL2B2Bs1CvBBCEEBGCHDDLiDCJCCFNNBkBBCGG0oesBCUaCoEMCE8BCLCCDICFFFCBBDSCMOCFCCDOCb9a9advCBi8UZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBvyehBB",!1)),M:()=>new g(E("5cgBgBlgHAB",!1)),Mn:()=>new g(E("5cgBgBlgHAB",!1)),Emoji:()=>new g(E("8mJA",!0)),Extended_Pictographic:()=>new g(E("8mJA",!0)),Lowercase:()=>new g(E("hCZBmDWBCGBiBuBCEECDOCDuBCBECEBBCCCBCCBBBDDBCBBCCBEBBCBBCECBCCDCCBCCBBBCCCBEEIBBCBBCBBCOCDQCDBBCCCBBBC4BCIBBCBBDCCBCBCGCiJCCEJJHCCBBBCCCBCCBPBCIBkBJJCUCGDDCBBDyBBxBgBCK2BCBMCD+CCDlBBq6ClBBCGGzW1CB0kCHHBpBBDCBhK0ECKgDCKHBJFBLHBJHBJFBMGCJHBZHBJHBJHBJEBMEBMDBNEBMEBqJEEBHHuBPBUzZzZBYBx5BvBBxBCCBBBDGCBCBCDDJCBCgDCJCCFuqeuqeCqBCUaCoEMCE8BCLECBICFCCDCCEUCBDBCEBCOCBCBCCCBQCZs5Vs5VBYBmmBnBBpEjBB9EKBCOBCGBCBBr3ByBB+EVB75CfBhsVfBhCYBoyehBB",!1)),Math:()=>new g(E("ycGDCHHFMMDDDCHHFAB",!1)),Uppercase:()=>new g(E("hDZB7BqBqBBWBCHBCuBCEECDOCDsBCDECBBBDCCDEEGDDECBDDDCCCDFFDEECDDECCGBBCBBCBBCOCBSCDBBCEECkBCEQCJDDBCCFICBEBCBBCCCBEEBCCBCBCEBDCCBDDIDDCBBEFBGLLBnFnFsBCCEEEBBBvBDBCdBCBBECBCWCBDBCGD1BvBBCgBCK0BCDMCBgDCyBlBBq6CqBBDCB5XFBjkCIBCvHvHERRzD0ECGGGC8CCBHBJFBLHBJHBJFBMGCJHBJNBzBBBNSSBPPBEEpLiBiBBOBFsasaBYBn6BvBBCEEBGCHDDLiDCJCCFNNBkBBCGG0oesBCUaCoEMCE8BCLCCDICFFFCBBDSCMOCFCCDOCb9a9advCBi8UZBumBnBBpEjBB8EKBCOBCGBCBBk4ByBB+DVB75CfBhsVfB8BYBvyehBB",!1))});static FOLD_SCRIPT=new na({Common:()=>new g(E("8cgBgB",!1)),Greek:()=>new g(E("1FwUwU",!1)),Inherited:()=>new g(E("5cgBgBlgHAB",!1))})},z=class Rt{static MAX_RUNE=1114111;static MAX_ASCII=127;static MAX_LATIN1=255;static MAX_BMP=65535;static MIN_FOLD=65;static MAX_FOLD=125251;static MIN_HIGH_SURROGATE=55296;static MAX_HIGH_SURROGATE=56319;static MIN_LOW_SURROGATE=56320;static MAX_LOW_SURROGATE=57343;static MIN_SUPPLEMENTARY_CODE_POINT=65536;static is32(e,t){let n=0,s=e.length;for(;n<s;){const i=n+Math.floor((s-n)/2),o=e.getLo(i),a=e.getHi(i);if(o<=t&&t<=a){const c=e.getStride(i);return(t-o)%c===0}t<o?s=i:n=i+1}return!1}static is(e,t){if(t<=Rt.MAX_LATIN1){for(let n=0;n<e.length;n++){if(t>e.getHi(n))continue;const s=e.getLo(n);if(t<s)return!1;const i=e.getStride(n);return(t-s)%i===0}return!1}return e.length>0&&t>=e.getLo(0)&&Rt.is32(e,t)}static isUpper(e){if(e<=Rt.MAX_LATIN1){const t=String.fromCodePoint(e);return t.toUpperCase()===t&&t.toLowerCase()!==t}return Rt.is(ct.Upper,e)}static isPrint(e){return e<=Rt.MAX_LATIN1?e>=32&&e<Rt.MAX_ASCII||e>=161&&e!==173:Rt.is(ct.Print,e)}static simpleFold(e){if(ct.CASE_ORBIT.has(e))return ct.CASE_ORBIT.get(e);const t=F.toLowerCase(e);return t!==e?t:F.toUpperCase(e)}static equalsIgnoreCase(e,t){if(e===t)return!0;if(e<0||t<0)return!1;if(e<=Rt.MAX_ASCII&&t<=Rt.MAX_ASCII)return 65<=e&&e<=90&&(e|=32),65<=t&&t<=90&&(t|=32),e===t;for(let n=Rt.simpleFold(e);n!==e;n=Rt.simpleFold(n))if(n===t)return!0;return!1}};const UB=256,wp=new Uint8Array(UB);for(let r=0;r<UB;r++)wp[r]=97<=r&&r<=122||65<=r&&r<=90||48<=r&&r<=57||r===95?1:0;let wc=null,Tc=null;var Y=class pt{static METACHARACTERS="\\.+*?()|[]{}^$";static EMPTY_BEGIN_LINE=1;static EMPTY_END_LINE=2;static EMPTY_BEGIN_TEXT=4;static EMPTY_END_TEXT=8;static EMPTY_WORD_BOUNDARY=16;static EMPTY_NO_WORD_BOUNDARY=32;static EMPTY_ALL=-1;static emptyInts(){return[]}static isByteArray(e){return Array.isArray(e)||e instanceof Uint8Array}static isalnum(e){return F.CODES.get("0")<=e&&e<=F.CODES.get("9")||F.CODES.get("a")<=e&&e<=F.CODES.get("z")||F.CODES.get("A")<=e&&e<=F.CODES.get("Z")}static unhex(e){return F.CODES.get("0")<=e&&e<=F.CODES.get("9")?e-F.CODES.get("0"):F.CODES.get("a")<=e&&e<=F.CODES.get("f")?e-F.CODES.get("a")+10:F.CODES.get("A")<=e&&e<=F.CODES.get("F")?e-F.CODES.get("A")+10:-1}static escapeRune(e){let t="";if(z.isPrint(e))pt.METACHARACTERS.indexOf(String.fromCodePoint(e))>=0&&(t+="\\"),t+=String.fromCodePoint(e);else switch(e){case F.CODES.get('"'):t+='\\"';break;case F.CODES.get("\\"):t+="\\\\";break;case F.CODES.get("	"):t+="\\t";break;case F.CODES.get(`
`):t+="\\n";break;case F.CODES.get("\r"):t+="\\r";break;case F.CODES.get("\b"):t+="\\b";break;case F.CODES.get("\f"):t+="\\f";break;default:{let n=e.toString(16);e<256?(t+="\\x",n.length===1&&(t+="0"),t+=n):t+=`\\x{${n}}`;break}}return t}static stringToRunes(e){const t=String(e),n=[];let s=0;for(;s<t.length;){const i=t.codePointAt(s);n.push(i),s+=i>z.MAX_BMP?2:1}return n}static runeToString(e){return String.fromCodePoint(e)}static isWordRune(e){return e<UB?wp[e]===1:!1}static emptyOpContext(e,t){let n=0;return e<0&&(n|=pt.EMPTY_BEGIN_TEXT|pt.EMPTY_BEGIN_LINE),e===10&&(n|=pt.EMPTY_BEGIN_LINE),t<0&&(n|=pt.EMPTY_END_TEXT|pt.EMPTY_END_LINE),t===10&&(n|=pt.EMPTY_END_LINE),pt.isWordRune(e)!==pt.isWordRune(t)?n|=pt.EMPTY_WORD_BOUNDARY:n|=pt.EMPTY_NO_WORD_BOUNDARY,n}static quoteMeta(e){return e.split("").map(t=>pt.METACHARACTERS.indexOf(t)>=0?`\\${t}`:t).join("")}static charCount(e){return e>z.MAX_BMP?2:1}static toArray(e){const t=e.length,n=new Array(t);for(let s=0;s<t;s++)n[s]=e[s];return n}static stringToUtf8ByteArray(e){if(globalThis.TextEncoder)return wc||(wc=new TextEncoder),wc.encode(e);{let t=[],n=0;for(let s=0;s<e.length;s++){let i=e.charCodeAt(s);i<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,t[n++]=i&63|128):(i&64512)===z.MIN_HIGH_SURROGATE&&s+1<e.length&&(e.charCodeAt(s+1)&64512)===z.MIN_LOW_SURROGATE?(i=z.MIN_SUPPLEMENTARY_CODE_POINT+((i&1023)<<10)+(e.charCodeAt(++s)&1023),t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=i&63|128):(t[n++]=i>>12|224,t[n++]=i>>6&63|128,t[n++]=i&63|128)}return t}}static utf8ByteArrayToString(e){if(globalThis.TextDecoder){Tc||(Tc=new TextDecoder("utf-8"));const t=e instanceof Uint8Array?e:new Uint8Array(e);return Tc.decode(t)}else{let t=[],n=0,s=0;for(;n<e.length;){let i=e[n++];if(i<128)t[s++]=String.fromCharCode(i);else if(i>191&&i<224){let o=e[n++];t[s++]=String.fromCharCode((i&31)<<6|o&63)}else if(i>239&&i<365){let o=e[n++],a=e[n++],c=e[n++],B=((i&7)<<18|(o&63)<<12|(a&63)<<6|c&63)-z.MIN_SUPPLEMENTARY_CODE_POINT;t[s++]=String.fromCharCode(z.MIN_HIGH_SURROGATE+(B>>10)),t[s++]=String.fromCharCode(z.MIN_LOW_SURROGATE+(B&1023))}else{let o=e[n++],a=e[n++];t[s++]=String.fromCharCode((i&15)<<12|(o&63)<<6|a&63)}}return t.join("")}}};const Tp=(r=[],e=0)=>{const t=Object.create(null);for(let n=0;n<r.length;n++){const s=r[n],i=e+n;t[s]=i,t[i]=s}return Object.freeze(t)};var Ur=class Yc{static Encoding=Tp(["UTF_16","UTF_8"]);getEncoding(){throw Error("not implemented")}asCharSequence(){throw Error("not implemented")}asBytes(){throw Error("not implemented")}length(){throw Error("not implemented")}isUTF8Encoding(){return this.getEncoding()===Yc.Encoding.UTF_8}isUTF16Encoding(){return this.getEncoding()===Yc.Encoding.UTF_16}},Od=class extends Ur{constructor(r=null){super(),this.bytes=r}getEncoding(){return Ur.Encoding.UTF_8}asCharSequence(){return Y.utf8ByteArrayToString(this.bytes)}asBytes(){return this.bytes}length(){return this.bytes.length}},NI=class extends Ur{constructor(r=null){super(),this.charSequence=r}getEncoding(){return Ur.Encoding.UTF_16}asCharSequence(){return this.charSequence}asBytes(){return Y.stringToUtf8ByteArray(this.charSequence.toString())}length(){return this.charSequence.length}},Pr=class{static utf16(r){return new NI(r)}static utf8(r){return Y.isByteArray(r)?new Od(r):new Od(Y.stringToUtf8ByteArray(r))}},it=class{static EOF(){return-8}constructor(){this.end=0}canCheckPrefix(){return!0}endPos(){return this.end}hasString(){return!1}hasAnyString(){return!1}prefixLength(){return 0}},FI=class extends it{constructor(r,e=0,t=r.length){super(),this.bytes=r,this.start=e,this.end=t}hasString(r,e){const t=r.bytes;if(t.length===0)return!0;const n=this.indexOf(this.bytes,t,this.start+e);return n!==-1&&n<=this.end-t.length}hasAnyString(r,e){return r.ac8?r.ac8.searchUTF8(this.bytes,this.start+e,this.end):!1}step(r){if(r+=this.start,r>=this.end)return it.EOF();const e=this.bytes[r]&255;if(e<128)return e<<3|1;if(e>=194&&e<=223&&r+1<this.end){const t=this.bytes[r+1]&255;return(t&192)!==128?e<<3|1:((e&31)<<6|t&63)<<3|2}else if(e>=224&&e<=239&&r+2<this.end){const t=this.bytes[r+1]&255;if((t&192)!==128)return e<<3|1;const n=this.bytes[r+2]&255;return(n&192)!==128?e<<3|1:((e&15)<<12|(t&63)<<6|n&63)<<3|3}else if(e>=240&&e<=244&&r+3<this.end){const t=this.bytes[r+1]&255;if((t&192)!==128)return e<<3|1;const n=this.bytes[r+2]&255;if((n&192)!==128)return e<<3|1;const s=this.bytes[r+3]&255;return(s&192)!==128?e<<3|1:((e&7)<<18|(t&63)<<12|(n&63)<<6|s&63)<<3|4}else return e<<3|1}index(r,e){e+=this.start;const t=this.indexOf(this.bytes,r.prefixUTF8,e);return t<0?t:t-e}context(r){r+=this.start;let e=-1;if(r>this.start&&r<=this.end){let n=r-1;if(e=this.bytes[n--],e>=128){let s=r-4;for(s<this.start&&(s=this.start);n>=s&&(this.bytes[n]&192)===128;)n--;n<this.start&&(n=this.start),e=this.step(n-this.start)>>3}}const t=r<this.end?this.step(r-this.start)>>3:-1;return Y.emptyOpContext(e,t)}indexOf(r,e,t=0){let n=e.length;if(n===0)return t<=this.end?t:-1;const s=e[0];let i=this.end-n;const o=typeof r.indexOf=="function";let a=t;for(;a<=i;){if(o){if(a=r.indexOf(s,a),a===-1||a>i)return-1}else{for(;a<=i&&r[a]!==s;)a++;if(a>i)return-1}let c=!0;for(let B=1;B<n;B++)if(r[a+B]!==e[B]){c=!1;break}if(c)return a;a++}return-1}prefixLength(r){return r.prefixUTF8.length}},LI=class extends it{constructor(r,e=0,t=r.length){super(),this.charSequence=r,this.start=e,this.end=t}hasString(r,e){const t=this.charSequence.indexOf(r.str,this.start+e);return t!==-1&&t<=this.end-r.str.length}hasAnyString(r,e){return r.ac16?r.ac16.searchUTF16(this.charSequence,this.start+e,this.end):!1}step(r){if(r+=this.start,r>=this.end)return it.EOF();const e=this.charSequence.charCodeAt(r);if(e<z.MIN_HIGH_SURROGATE||e>z.MAX_HIGH_SURROGATE||r+1>=this.end)return e<<3|1;const t=this.charSequence.charCodeAt(r+1);return t>=z.MIN_LOW_SURROGATE&&t<=z.MAX_LOW_SURROGATE?(e-z.MIN_HIGH_SURROGATE)*1024+(t-z.MIN_LOW_SURROGATE)+z.MIN_SUPPLEMENTARY_CODE_POINT<<3|2:e<<3|1}index(r,e){e+=this.start;const t=this.charSequence.indexOf(r.prefix,e);return t<0||t>this.end-r.prefix.length?-1:t-e}context(r){r+=this.start;const e=r>this.start&&r<=this.end?this.charSequence.charCodeAt(r-1):-1,t=r<this.end?this.charSequence.charCodeAt(r):-1;return Y.emptyOpContext(e,t)}prefixLength(r){return r.prefix.length}},we=class{static fromUTF8(r,e=0,t=r.length){return new FI(r,e,t)}static fromUTF16(r,e=0,t=r.length){return new LI(r,e,t)}},Io=class extends Error{constructor(r){super(r),this.name="RE2JSException"}},De=class extends Io{constructor(r,e=null){let t=`error parsing regexp: ${r}`;e&&(t+=`: \`${e}\``),super(t),this.name="RE2JSSyntaxException",this.message=t,this.error=r,this.input=e}getDescription(){return this.error}getPattern(){return this.input}},xI=class extends Io{constructor(r){super(r),this.name="RE2JSCompileException"}},ut=class extends Io{constructor(r){super(r),this.name="RE2JSGroupException"}},VI=class extends Io{constructor(r){super(r),this.name="RE2JSFlagsException"}},Li=class extends Io{constructor(r){super(r),this.name="RE2JSInternalException"}},Nd=class Ap{static MAX_REPLACER_ARGS=65535;static quoteReplacement(e,t=!1){return t?e.indexOf("\\")<0&&e.indexOf("$")<0?e:e.split("").map(n=>{const s=n.codePointAt(0);return s===F.CODES.get("\\")||s===F.CODES.get("$")?`\\${n}`:n}).join(""):e.indexOf("$")<0?e:e.split("").map(n=>n.codePointAt(0)===F.CODES.get("$")?"$$":n).join("")}constructor(e,t){if(e===null)throw new Error("pattern is null");this.patternInput=e;const n=this.patternInput.re2();this.patternGroupCount=n.numberOfCapturingGroups(),this.groups=[],this.namedGroups=n.namedGroups,this.numberOfInstructions=n.numberOfInstructions(),t instanceof Ur?this.resetMatcherInput(t):Y.isByteArray(t)?this.resetMatcherInput(Pr.utf8(t)):this.resetMatcherInput(Pr.utf16(t))}pattern(){return this.patternInput}reset(){return this.matcherInputLength=this.matcherInput.length(),this.appendPos=0,this.hasMatch=!1,this.hasGroups=!1,this.anchorFlag=0,this}resetMatcherInput(e){if(e===null)throw new Error("input is null");return e instanceof Ur||(Y.isByteArray(e)?e=Pr.utf8(e):e=Pr.utf16(e)),this.matcherInput=e,this.reset(),this}start(e=0){if(typeof e=="string"){const t=this.namedGroups[e];if(!Number.isFinite(t))throw new ut(`group '${e}' not found`);e=t}return this.loadGroup(e),this.groups[2*e]}end(e=0){if(typeof e=="string"){const t=this.namedGroups[e];if(!Number.isFinite(t))throw new ut(`group '${e}' not found`);e=t}return this.loadGroup(e),this.groups[2*e+1]}programSize(){return this.numberOfInstructions}group(e=0){if(typeof e=="string"){const s=this.namedGroups[e];if(!Number.isFinite(s))throw new ut(`group '${e}' not found`);e=s}const t=this.start(e),n=this.end(e);return t<0&&n<0?null:this.substring(t,n)}getNamedGroups(){if(!this.hasMatch)throw new ut("perhaps no match attempted");const e=Object.create(null);for(const t of Object.keys(this.namedGroups))e[t]=this.group(t);return e}groupCount(){return this.patternGroupCount}loadGroup(e){if(e<0||e>this.patternGroupCount)throw new ut(`Group index out of bounds: ${e}`);if(!this.hasMatch)throw new ut("perhaps no match attempted");if(e===0||this.hasGroups)return;const t=this.matcherInputLength,n=this.patternInput.re2().matchMachineInput(this.matcherInput,this.groups[0],t,this.anchorFlag,1+this.patternGroupCount);if(!n[0])throw new ut("inconsistency in matching group data");this.groups=n[1],this.hasGroups=!0}matches(){return this.genMatch(0,k.ANCHOR_BOTH)}lookingAt(){return this.genMatch(0,k.ANCHOR_START)}find(e=null){if(e!==null){if(e<0||e>this.matcherInputLength)throw new ut(`start index out of bounds: ${e}`);return this.reset(),this.genMatch(e,0)}if(e=0,this.hasMatch&&(e=this.groups[1],this.groups[0]===this.groups[1])){const t=(this.matcherInput.isUTF16Encoding()?we.fromUTF16(this.matcherInput.asCharSequence(),0,this.matcherInputLength):we.fromUTF8(this.matcherInput.asBytes(),0,this.matcherInputLength)).step(e);t<0?e++:e+=t&7}return this.genMatch(e,k.UNANCHORED)}genMatch(e,t){const n=this.patternInput.re2().matchMachineInput(this.matcherInput,e,this.matcherInputLength,t,1);return n[0]?(this.groups=n[1],this.hasMatch=!0,this.hasGroups=this.patternGroupCount===0,this.anchorFlag=t,!0):(this.hasMatch=!1,!1)}substring(e,t){return this.matcherInput.isUTF8Encoding()?Y.utf8ByteArrayToString(this.matcherInput.asBytes().slice(e,t)):this.matcherInput.asCharSequence().substring(e,t).toString()}inputLength(){return this.matcherInputLength}appendReplacement(e,t=!1){let n="";const s=this.start(),i=this.end();return this.appendPos<s&&(n+=this.substring(this.appendPos,s)),this.appendPos=i,n+=t?this.appendReplacementInternalJava(e):this.appendReplacementInternalJs(e),n}appendReplacementInternalJava(e){let t="",n=0;const s=e.length;let i=0;for(;i<s;){const o=e.codePointAt(i);if(o===F.CODES.get("\\")){if(n<i&&(t+=e.substring(n,i)),i++,i>=s)throw new ut("character to be escaped is missing");n=i,i++;continue}if(o===F.CODES.get("$")){if(n<i&&(t+=e.substring(n,i)),i+1>=s)throw new ut("Illegal group reference: group index is missing");const a=e.codePointAt(i+1);if(F.CODES.get("0")<=a&&a<=F.CODES.get("9")){let c=a-F.CODES.get("0"),B=i+2;for(;B<s;B++){const d=e.codePointAt(B);if(d<F.CODES.get("0")||d>F.CODES.get("9")||c*10+d-F.CODES.get("0")>this.patternGroupCount)break;c=c*10+d-F.CODES.get("0")}if(c>this.patternGroupCount)throw new ut(`n > number of groups: ${c}`);const h=this.group(c);h!==null&&(t+=h),i=B,n=i}else if(a===F.CODES.get("{")){let c=i+2;for(;c<s&&e.codePointAt(c)!==F.CODES.get("}");)c++;if(c>=s)throw new ut("named capture group is missing trailing '}'");const B=e.substring(i+2,c),h=this.group(B);h!==null&&(t+=h),i=c+1,n=i}else throw new ut("Illegal group reference");continue}i++}return n<s&&(t+=e.substring(n,s)),t}appendReplacementInternalJs(e){let t="",n=0;const s=e.length;for(let i=0;i<s-1;i++)if(e.codePointAt(i)===F.CODES.get("$")){let o=e.codePointAt(i+1);if(F.CODES.get("$")===o){n<i&&(t+=e.substring(n,i)),t+="$",i++,n=i+1;continue}else if(F.CODES.get("&")===o){n<i&&(t+=e.substring(n,i));const a=this.group(0);a!==null?t+=a:t+="$&",i++,n=i+1;continue}else if(F.CODES.get("`")===o){n<i&&(t+=e.substring(n,i)),t+=this.substring(0,this.start(0)),i++,n=i+1;continue}else if(F.CODES.get("'")===o){n<i&&(t+=e.substring(n,i)),t+=this.substring(this.end(0),this.matcherInputLength),i++,n=i+1;continue}else if(F.CODES.get("1")<=o&&o<=F.CODES.get("9")){let a=o-F.CODES.get("0");for(n<i&&(t+=e.substring(n,i)),i+=2;i<s&&(o=e.codePointAt(i),!(o<F.CODES.get("0")||o>F.CODES.get("9")||a*10+o-F.CODES.get("0")>this.patternGroupCount));i++)a=a*10+o-F.CODES.get("0");if(a>this.patternGroupCount){t+=`$${a}`,n=i,i--;continue}const c=this.group(a);c!==null&&(t+=c),n=i,i--;continue}else if(o===F.CODES.get("<")){n<i&&(t+=e.substring(n,i)),i++;let a=i+1;for(;a<e.length&&e.codePointAt(a)!==F.CODES.get(">")&&e.codePointAt(a)!==F.CODES.get(" ");)a++;if(a===e.length||e.codePointAt(a)!==F.CODES.get(">")){t+=e.substring(i-1,a+1),n=a+1,i=a;continue}const c=e.substring(i+1,a);if(Object.prototype.hasOwnProperty.call(this.namedGroups,c)){const B=this.group(c);B!==null&&(t+=B)}else t+=`$<${c}>`;n=a+1,i=a;continue}}return n<s&&(t+=e.substring(n,s)),t}appendTail(){return this.substring(this.appendPos,this.matcherInputLength)}replaceAll(e,t=!1){return this.replace(e,!0,t)}replaceFirst(e,t=!1){return this.replace(e,!1,t)}replace(e,t=!0,n=!1){let s="";this.reset();const i=typeof e=="function",o=Object.keys(this.namedGroups).length>0;let a=null;if(i){if(this.groupCount()>=Ap.MAX_REPLACER_ARGS)throw new ut("Too many capture groups to safely invoke replacer function");a=this.matcherInput.isUTF8Encoding()?this.matcherInput.asBytes():this.matcherInput.asCharSequence()}for(;this.find()&&(s+=i?this.appendReplacementFunc(e,o,a):this.appendReplacement(e,n),!!t););return s+=this.appendTail(),s}appendReplacementFunc(e,t,n){let s="";const i=this.start(),o=this.end();this.appendPos<i&&(s+=this.substring(this.appendPos,i)),this.appendPos=o;const a=this.buildReplacerArgs(i,t,n);return s+=String(e(...a)),s}buildReplacerArgs(e,t,n){const s=[this.group(0)],i=this.groupCount();for(let o=1;o<=i;o++){const a=this.start(o);a<0?s.push(void 0):s.push(this.substring(a,this.end(o)))}if(s.push(e),s.push(n),t){const o=this.getNamedGroups();for(const a in o)o[a]===null&&(o[a]=void 0);s.push(o)}return s}},L=class He{static ALT=1;static ALT_MATCH=2;static CAPTURE=3;static EMPTY_WIDTH=4;static FAIL=5;static MATCH=6;static NOP=7;static RUNE=8;static RUNE1=9;static RUNE_ANY=10;static RUNE_ANY_NOT_NL=11;static LB_WRITE=12;static LB_CHECK=13;static isRuneOp(e){return He.RUNE<=e&&e<=He.RUNE_ANY_NOT_NL}static escapeRunes(e){let t='"';for(let n of e)t+=Y.escapeRune(n);return t+='"',t}constructor(e){this.op=e,this.out=0,this.arg=0,this.runes=[],this.next=null}matchRune(e){if(this.runes.length===1){const o=this.runes[0];return this.arg&k.FOLD_CASE?z.equalsIgnoreCase(o,e):e===o}const t=this.runes.length;if(t===0)return!1;if(t===2||t===4||t===6||t===8){for(let o=0;o<t;o+=2){if(e<this.runes[o])return!1;if(e<=this.runes[o+1])return!0}return!1}let n=0,s=t>>1;for(;s>1;){const o=s>>1;n+=this.runes[n+o<<1]<=e?o:0,s-=o}n+=this.runes[n<<1]<=e?1:0;const i=n-1;return i>=0&&e<=this.runes[i<<1|1]}matchRunePos(e){if(this.runes.length===1){const o=this.runes[0];return this.arg&k.FOLD_CASE?z.equalsIgnoreCase(o,e)?0:-1:e===o?0:-1}const t=this.runes.length;if(t===0)return-1;if(t===2||t===4||t===6||t===8){for(let o=0;o<t;o+=2){if(e<this.runes[o])return-1;if(e<=this.runes[o+1])return Math.floor(o/2)}return-1}let n=0,s=t>>1;for(;s>1;){const o=s>>1;n+=this.runes[n+o<<1]<=e?o:0,s-=o}n+=this.runes[n<<1]<=e?1:0;const i=n-1;return i>=0&&e<=this.runes[i<<1|1]?i:-1}toString(){switch(this.op){case He.ALT:return`alt -> ${this.out}, ${this.arg}`;case He.ALT_MATCH:return`altmatch -> ${this.out}, ${this.arg}`;case He.CAPTURE:return`cap ${this.arg} -> ${this.out}`;case He.EMPTY_WIDTH:return`empty ${this.arg} -> ${this.out}`;case He.MATCH:return`match${this.arg!==0?` ${this.arg}`:""}`;case He.FAIL:return"fail";case He.NOP:return`nop -> ${this.out}`;case He.LB_WRITE:return`lbwrite ${this.arg} -> ${this.out}`;case He.LB_CHECK:return`lbcheck ${this.arg} -> ${this.out}`;case He.RUNE:return this.runes===null?"rune <null>":["rune ",He.escapeRunes(this.runes),this.arg&k.FOLD_CASE?"/i":""," -> ",this.out].join("");case He.RUNE1:return`rune1 ${He.escapeRunes(this.runes)} -> ${this.out}`;case He.RUNE_ANY:return`any -> ${this.out}`;case He.RUNE_ANY_NOT_NL:return`anynotnl -> ${this.out}`;default:throw new Error("unhandled case in Inst.toString")}}},Fd=class{constructor(r){this.sparse=new Int32Array(r),this.densePcs=new Int32Array(r),this.denseCaps=null,this.size=0,this.ncap=0}init(r){this.ncap=r;const e=this.densePcs.length*r;(!this.denseCaps||this.denseCaps.length<e)&&(this.denseCaps=new Int32Array(e))}contains(r){const e=this.sparse[r];return e<this.size&&this.densePcs[e]===r}isEmpty(){return this.size===0}add(r){const e=this.size++;return this.sparse[r]=e,this.densePcs[e]=r,e}clear(){this.size=0}toString(){let r="{";for(let e=0;e<this.size;e++)e!==0&&(r+=", "),r+=this.densePcs[e];return r+="}",r}},kI=class Xc{static fromRE2(e){const t=new Xc;return t.prog=e.prog,t.re2=e,t.q0=new Fd(t.prog.numInst()),t.q1=new Fd(t.prog.numInst()),t.matched=!1,t.matchcap=new Int32Array(t.prog.numCap<2?2:t.prog.numCap),t.ncap=0,t}static fromMachine(e){return Xc.fromRE2(e.re2)}constructor(){this.prog=null,this.re2=null,this.q0=null,this.q1=null,this.matched=!1,this.matchcap=null,this.ncap=0,this.lbTable=null}init(e){this.ncap=e,e>this.matchcap.length?this.matchcap=new Int32Array(e).fill(-1):this.matchcap.fill(-1),this.q0.init(e),this.q1.init(e),this.prog.numLb>0&&((!this.lbTable||this.lbTable.length<this.prog.numLb+1)&&(this.lbTable=new Int32Array(this.prog.numLb+1)),this.lbTable.fill(-1))}submatches(){return this.ncap===0?Y.emptyInts():Y.toArray(this.matchcap.subarray(0,this.ncap))}match(e,t,n){const s=this.re2.cond;if(s===Y.EMPTY_ALL||(n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&t!==0)return!1;this.matched=!1,this.matchcap.fill(-1);let i=this.prog.numLb>0?0:t,o=t,a=this.q0,c=this.q1,B=e.step(i),h=B>>3,d=B&7,C=-1,I=0;B!==it.EOF()&&(B=e.step(i+d),C=B>>3,I=B&7);let R;for(i===0?R=Y.emptyOpContext(-1,h):R=e.context(i);;){if(a.isEmpty()){if(s&Y.EMPTY_BEGIN_TEXT&&i!==0||(n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&i!==0||this.matched)break;if(this.prog.numLb===0&&this.re2.prefix.length!==0&&C!==this.re2.prefixRune&&e.canCheckPrefix()){const K=e.index(this.re2,i);if(K<0)break;i+=K,B=e.step(i),h=B>>3,d=B&7,B=e.step(i+d),C=B>>3,I=B&7,R=e.context(i)}}if(i===0&&this.prog.numLb>0)for(let K=0;K<this.prog.lbStarts.length;K++)this.add(a,this.prog.lbStarts[K],i,this.matchcap,0,R);!this.matched&&(i===0||n===k.UNANCHORED)&&i>=o&&(this.ncap>0&&(this.matchcap[0]=i),this.add(a,this.prog.start,i,this.matchcap,0,R));const N=i+d;if(R=e.context(N),this.step(a,c,i,N,h,R,n,i===e.endPos()),d===0||this.ncap===0&&this.matched)break;i+=d,h=C,d=I,h!==-1&&(B=e.step(i+d),C=B>>3,I=B&7);const M=a;a=c,c=M}return c.clear(),this.matched}matchSet(e,t,n){const s=this.re2.cond;if(s===Y.EMPTY_ALL)return[];if((n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&t!==0)return[];let i=this.prog.numLb>0?0:t,o=t,a=this.q0,c=this.q1,B=e.step(i),h=B>>3,d=B&7,C=-1,I=0;B!==it.EOF()&&(B=e.step(i+d),C=B>>3,I=B&7);let R=i===0?Y.emptyOpContext(-1,h):e.context(i);const N=new Set;for(;!(a.isEmpty()&&(s&Y.EMPTY_BEGIN_TEXT&&i!==0||(n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&i!==0));){if(i===0&&this.prog.numLb>0)for(let Z=0;Z<this.prog.lbStarts.length;Z++)this.add(a,this.prog.lbStarts[Z],i,this.matchcap,0,R);(i===0||n===k.UNANCHORED)&&i>=o&&this.add(a,this.prog.start,i,this.matchcap,0,R);const M=i+d;R=e.context(M);for(let Z=0;Z<a.size;Z++){const te=a.densePcs[Z],ce=this.prog.inst[te],fe=Z*this.ncap;let oe=!1;switch(ce.op){case L.MATCH:if(n===k.ANCHOR_BOTH&&i!==e.endPos())break;N.add(ce.arg);break;case L.RUNE:oe=ce.matchRune(h);break;case L.RUNE1:oe=h===ce.runes[0];break;case L.RUNE_ANY:oe=!0;break;case L.RUNE_ANY_NOT_NL:oe=h!==10;break;default:continue}oe&&this.add(c,ce.out,M,a.denseCaps,fe,R)}if(a.clear(),d===0)break;i+=d,h=C,d=I,h!==-1&&(B=e.step(i+d),C=B>>3,I=B&7);const K=a;a=c,c=K}return c.clear(),Array.from(N).sort((M,K)=>M-K)}step(e,t,n,s,i,o,a,c){const B=this.re2.longest;for(let h=0;h<e.size;h++){const d=e.densePcs[h],C=h*this.ncap;if(B&&this.matched&&this.ncap>0&&this.matchcap[0]<e.denseCaps[C])continue;const I=this.prog.inst[d];let R=!1;switch(I.op){case L.MATCH:if(a===k.ANCHOR_BOTH&&!c)break;if(this.ncap>0&&(!B||!this.matched||this.matchcap[1]<n)){e.denseCaps[C+1]=n;for(let N=0;N<this.ncap;N++)this.matchcap[N]=e.denseCaps[C+N]}B||(e.size=0),this.matched=!0;break;case L.RUNE:R=I.matchRune(i);break;case L.RUNE1:R=i===I.runes[0];break;case L.RUNE_ANY:R=!0;break;case L.RUNE_ANY_NOT_NL:R=i!==10;break;default:continue}R&&this.add(t,I.out,s,e.denseCaps,C,o)}e.clear()}add(e,t,n,s,i,o){for(;;){if(t===0||e.contains(t))return;const a=e.add(t),c=this.prog.inst[t];switch(c.op){case L.FAIL:return;case L.ALT:case L.ALT_MATCH:this.add(e,c.out,n,s,i,o),t=c.arg;continue;case L.EMPTY_WIDTH:if(!(c.arg&~o)){t=c.out;continue}return;case L.NOP:t=c.out;continue;case L.CAPTURE:if(c.arg<this.ncap){const B=s[i+c.arg];s[i+c.arg]=n,this.add(e,c.out,n,s,i,o),s[i+c.arg]=B;return}else{t=c.out;continue}case L.LB_WRITE:this.lbTable[Math.abs(c.arg)]=n,t=c.out;continue;case L.LB_CHECK:if(c.arg>0){if(this.lbTable[c.arg]===n){t=c.out;continue}}else if(this.lbTable[-c.arg]!==n){t=c.out;continue}return;case L.MATCH:case L.RUNE:case L.RUNE1:case L.RUNE_ANY:case L.RUNE_ANY_NOT_NL:if(this.ncap>0){const B=a*this.ncap;for(let h=0;h<this.ncap;h++)e.denseCaps[B+h]=s[i+h]}return;default:throw new Li("unhandled")}}}};const Ld=r=>{let e=-2128831035;for(let t=0;t<r.length;t++)e^=r[t],e=Math.imul(e,16777619);return e},MI=(r,e)=>{if(r.length!==e.length)return!1;for(let t=0;t<r.length;t++)if(r[t]!==e[t])return!1;return!0};var GI=class{constructor(r,e,t=[]){this.nfaStates=r,this.isMatch=e,this.matchIDs=t,this.nextLatin1=new Array(z.MAX_LATIN1+1).fill(null),this.nextLatin1Anchored=new Array(z.MAX_LATIN1+1).fill(null),this.transKeys=[],this.transVals=[],this.lastSeen=0}},UI=class Zc{static MAX_CACHE_CLEARS=5;static STATE_MEMORY_ESTIMATE=838;constructor(e,t=8388608){this.prog=e,this.stateCache=new Map,this.stateCount=0,this.startState=null,this.stateLimit=Math.max(1,Math.floor(t/Zc.STATE_MEMORY_ESTIMATE)),this.cacheClears=0,this.failed=!1,this.clock=0}computeClosure(e){const t=new Set,n=[...e];let s=!1;const i=[];for(;n.length>0;){const a=n.pop();if(t.has(a))continue;t.add(a);const c=this.prog.getInst(a);switch(c.op){case L.MATCH:s=!0,i.includes(c.arg)||i.push(c.arg);break;case L.ALT:case L.ALT_MATCH:n.push(c.out),n.push(c.arg);break;case L.NOP:case L.CAPTURE:n.push(c.out);break;case L.EMPTY_WIDTH:case L.LB_WRITE:case L.LB_CHECK:return null}}const o=Int32Array.from(t).sort();return i.sort((a,c)=>a-c),{pcs:o,isMatch:s,matchIDs:i}}getState(e){const t=this.computeClosure(e);if(!t)return null;const n=t.pcs,s=Ld(n);let i=this.stateCache.get(s);if(i)for(let a=0;a<i.length;a++){const c=i[a];if(MI(c.nfaStates,n))return c.lastSeen=++this.clock,c}else i=[],this.stateCache.set(s,i);if(this.failed)return null;if(this.stateCount>=this.stateLimit){if(this.cacheClears++,this.cacheClears>=Zc.MAX_CACHE_CLEARS)return this.failed=!0,this.stateCache.clear(),this.stateCount=0,this.startState=null,null;this.evictCache(),i=this.stateCache.get(s),i||(i=[],this.stateCache.set(s,i))}const o=new GI(n,t.isMatch,t.matchIDs);return o.lastSeen=++this.clock,i.push(o),this.stateCount++,o}evictCache(){const e=[];for(const o of this.stateCache.values())for(let a=0;a<o.length;a++)e.push(o[a]);e.sort((o,a)=>o.lastSeen-a.lastSeen);const t=Math.max(1,Math.floor(this.stateLimit/2)),n=e.length-t,s=e.slice(n),i=new Set(s);this.stateCache.clear(),this.stateCount=0;for(let o=0;o<s.length;o++){const a=s[o];a.nextLatin1.fill(null),a.nextLatin1Anchored.fill(null),a.transKeys.length=0,a.transVals.length=0;const c=Ld(a.nfaStates);let B=this.stateCache.get(c);B||(B=[],this.stateCache.set(c,B)),B.push(a),this.stateCount++}this.startState&&!i.has(this.startState)&&(this.startState=null)}step(e,t,n){if(t<=z.MAX_LATIN1)if(n===k.UNANCHORED){const o=e.nextLatin1[t];if(o!==null)return o}else{const o=e.nextLatin1Anchored[t];if(o!==null)return o}else{const o=t+(n===k.UNANCHORED?0:z.MAX_RUNE+1),a=e.transKeys,c=a.length;for(let B=0;B<c;B++)if(a[B]===o)return e.transVals[B]}const s=[];for(let o=0;o<e.nfaStates.length;o++){const a=e.nfaStates[o],c=this.prog.getInst(a);L.isRuneOp(c.op)&&c.matchRune(t)&&s.push(c.out)}n===k.UNANCHORED&&s.push(this.prog.start);const i=this.getState(s);if(t<=z.MAX_LATIN1)n===k.UNANCHORED?e.nextLatin1[t]=i:e.nextLatin1Anchored[t]=i;else{const o=t+(n===k.UNANCHORED?0:z.MAX_RUNE+1);e.transKeys.push(o),e.transVals.push(i)}return i}match(e,t,n){if((n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&t!==0)return!1;if(!this.startState&&(this.startState=this.getState([this.prog.start]),!this.startState))return null;let s=e.endPos(),i=this.startState;if(i.isMatch)if(n===k.ANCHOR_BOTH){if(t===s)return!0}else return!0;let o=t;for(;o<s;){const a=e.step(o),c=a>>3,B=a&7;if(B===0)break;if(i=n===k.UNANCHORED&&c<=z.MAX_LATIN1&&i.nextLatin1[c]||this.step(i,c,n),i===null)return null;if(i.lastSeen=++this.clock,i.isMatch)if(n===k.ANCHOR_BOTH){if(o+B===s)return!0}else return!0;if(i.nfaStates.length===0&&n!==k.UNANCHORED)return!1;o+=B}return!1}matchSet(e,t,n){if((n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&t!==0)return[];if(!this.startState&&(this.startState=this.getState([this.prog.start]),!this.startState))return null;let s=e.endPos(),i=this.startState;const o=new Set,a=(B,h)=>{B.isMatch&&(n===k.ANCHOR_BOTH?h===s&&B.matchIDs.forEach(d=>o.add(d)):B.matchIDs.forEach(d=>o.add(d)))};a(i,t);let c=t;for(;c<s;){const B=e.step(c),h=B>>3,d=B&7;if(d===0)break;if(i=n===k.UNANCHORED&&h<=z.MAX_LATIN1&&i.nextLatin1[h]||this.step(i,h,n),i===null)return null;if(i.lastSeen=++this.clock,c+=d,a(i,c),i.nfaStates.length===0&&n!==k.UNANCHORED)break}return Array.from(o).sort((B,h)=>B-h)}};const HI=32,jI=500,Ac=256,qI=256*1024;var JI=class{constructor(){this.end=0,this.cap=new Int32Array(0),this.matchcap=new Int32Array(0),this.ncap=0,this.jobPc=new Int32Array(Ac),this.jobArg=new Uint8Array(Ac),this.jobPos=new Int32Array(Ac),this.jobLen=0,this.visited=new Uint32Array(0)}reset(r,e,t){this.end=e,this.jobLen=0,this.ncap=t;const n=r.numInst()*(e+1)+HI-1>>>5;this.visited.length<n?this.visited=new Uint32Array(n):this.visited.fill(0,0,n),this.cap.length<t?this.cap=new Int32Array(t).fill(-1):this.cap.fill(-1,0,t),this.matchcap.length<t?this.matchcap=new Int32Array(t).fill(-1):this.matchcap.fill(-1,0,t)}shouldVisit(r,e){const t=r*(this.end+1)+e,n=t>>>5,s=1<<(t&31);return this.visited[n]&s?!1:(this.visited[n]|=s,!0)}push(r,e,t,n){if(r.prog.getInst(e).op!==L.FAIL&&(n||this.shouldVisit(e,t))){if(this.jobLen>=this.jobPc.length){const s=this.jobPc.length*2,i=new Int32Array(s);i.set(this.jobPc),this.jobPc=i;const o=new Uint8Array(s);o.set(this.jobArg),this.jobArg=o;const a=new Int32Array(s);a.set(this.jobPos),this.jobPos=a}this.jobPc[this.jobLen]=e,this.jobArg[this.jobLen]=n?1:0,this.jobPos[this.jobLen]=t,this.jobLen++}}tryBacktrack(r,e,t,n,s){const i=r.longest;for(this.push(r,t,n,!1);this.jobLen>0;){this.jobLen--;let o=this.jobPc[this.jobLen],a=this.jobArg[this.jobLen]===1,c=this.jobPos[this.jobLen],B=!0;for(;!(!B&&!this.shouldVisit(o,c));){B=!1;const h=r.prog.getInst(o);switch(h.op){case L.FAIL:throw new Li("unexpected InstFail");case L.ALT:if(a){a=!1,o=h.arg;continue}else{this.push(r,o,c,!0),o=h.out;continue}case L.ALT_MATCH:{const d=r.prog.getInst(h.out);if(L.isRuneOp(d.op)){this.push(r,h.arg,c,!1),o=h.arg,c=this.end;continue}this.push(r,h.out,this.end,!1),o=h.out;continue}case L.RUNE:{const d=e.step(c);if(d===it.EOF()||!h.matchRune(d>>3))break;c+=d&7,o=h.out;continue}case L.RUNE1:{const d=e.step(c);if(d===it.EOF()||d>>3!==h.runes[0])break;c+=d&7,o=h.out;continue}case L.RUNE_ANY_NOT_NL:{const d=e.step(c);if(d===it.EOF()||d>>3===10)break;c+=d&7,o=h.out;continue}case L.RUNE_ANY:{const d=e.step(c);if(d===it.EOF())break;c+=d&7,o=h.out;continue}case L.CAPTURE:if(a){this.cap[h.arg]=c;break}else{h.arg<this.ncap&&(this.push(r,o,this.cap[h.arg],!0),this.cap[h.arg]=c),o=h.out;continue}case L.EMPTY_WIDTH:{const d=e.context(c);if(h.arg&~d)break;o=h.out;continue}case L.NOP:o=h.out;continue;case L.MATCH:{if(s===k.ANCHOR_BOTH&&c!==this.end)break;if(this.ncap===0)return!0;this.ncap>1&&(this.cap[1]=c);const d=this.matchcap[1];if((d===-1||i&&c>0&&c>d)&&this.matchcap.set(this.cap),!i||c===this.end)return!0;break}case L.LB_WRITE:case L.LB_CHECK:throw new Li("Backtracker cannot evaluate Lookbehind instructions");default:throw new Li("bad inst")}break}}return i&&this.matchcap.length>1&&this.matchcap[1]>=0}};const ra=[];var sa=class vp{static shouldBacktrack(e){return e.numInst()<=jI}static maxBitStateLen(e){return vp.shouldBacktrack(e)?Math.floor(qI/e.numInst()):0}static execute(e,t,n,s,i){const o=e.cond;if(o===Y.EMPTY_ALL||(s===k.ANCHOR_START||s===k.ANCHOR_BOTH)&&n!==0||o&Y.EMPTY_BEGIN_TEXT&&n!==0)return null;const a=ra.length>0?ra.pop():new JI,c=t.endPos();a.reset(e.prog,c,i);let B=!1;if(o&Y.EMPTY_BEGIN_TEXT||s===k.ANCHOR_START||s===k.ANCHOR_BOTH)a.ncap>0&&(a.cap[0]=n),a.tryBacktrack(e,t,e.prog.start,n,s)&&(B=!0);else{let d=-1;for(;n<=c&&d!==0;n+=d){if(e.prefix.length>0){const I=t.index(e,n);if(I<0)break;n+=I}if(a.ncap>0&&(a.cap[0]=n),a.tryBacktrack(e,t,e.prog.start,n,s)){B=!0;break}const C=t.step(n);d=C===it.EOF()?0:C&7}}if(!B)return ra.push(a),null;const h=i===0?[]:Y.toArray(a.matchcap.subarray(0,i));return ra.push(a),h}},xd=class{constructor(r){this.sparse=new Uint32Array(r),this.dense=new Uint32Array(r),this.size=0,this.nextIndex=0}empty(){return this.nextIndex>=this.size}next(){return this.dense[this.nextIndex++]}clear(){this.size=0,this.nextIndex=0}contains(r){return r<this.sparse.length&&this.sparse[r]<this.size&&this.dense[this.sparse[r]]===r}insert(r){this.contains(r)||this.insertNew(r)}insertNew(r){r>=this.sparse.length||(this.sparse[r]=this.size,this.dense[this.size]=r,this.size++)}};const KI=(r,e,t,n)=>{const s=r.length,i=e.length;let o=0,a=0;const c=[],B=[];let h=!0,d=-1;const C=I=>{const R=I?r:e,N=I?o:a,M=I?t:n;return d>0&&R[N]<=c[d]?!1:(c.push(R[N],R[N+1]),I?o+=2:a+=2,d+=2,B.push(M),!0)};for(;o<s||a<i;)if(a>=i?h=C(!0):o>=s||e[a]<r[o]?h=C(!1):h=C(!0),!h)return null;return{merged:c,next:B}};var zI=class{constructor(r){this.start=r.start,this.numCap=r.numCap,this.inst=new Array(r.inst.length);for(let e=0;e<r.inst.length;e++){const t=r.inst[e],n=new L(t.op);n.out=t.out,n.arg=t.arg,n.runes=t.runes?t.runes.slice():[],n.next=null,this.inst[e]=n}}};const $I=r=>{const e=new zI(r);for(let t=0;t<e.inst.length;t++){const n=e.inst[t];if(n.op!==L.ALT&&n.op!==L.ALT_MATCH)continue;let s="out",i="arg",o=e.inst[n[i]];if(o.op!==L.ALT&&o.op!==L.ALT_MATCH&&(s="arg",i="out",o=e.inst[n[i]],o.op!==L.ALT&&o.op!==L.ALT_MATCH))continue;const a=e.inst[n[s]];if(a.op===L.ALT||a.op===L.ALT_MATCH)continue;let c="out",B="arg",h=!1;o.out===t?h=!0:o.arg===t&&(h=!0,c="arg",B="out"),h&&(o[c]=n[s]),n[s]===o[c]&&(n[i]=o[B])}return e},QI=r=>{if(r.inst.length>=1e3)return null;const e=new xd(r.inst.length),t=new xd(r.inst.length),n=new Array(r.inst.length),s=new Array(r.inst.length).fill(!1),i=o=>{let a=!0;const c=r.inst[o];if(t.contains(o))return!0;switch(t.insert(o),c.op){case L.ALT:case L.ALT_MATCH:{a=i(c.out)&&i(c.arg);let B=s[c.out],h=s[c.arg];if(B&&h)return!1;if(h){const R=c.out;c.out=c.arg,c.arg=R;const N=B;B=h,h=N}B&&(s[o]=!0,c.op=L.ALT_MATCH);const d=n[c.out]||[],C=n[c.arg]||[],I=KI(d,C,c.out,c.arg);if(!I)return!1;n[o]=I.merged,c.next=new Uint32Array(I.next);break}case L.CAPTURE:case L.EMPTY_WIDTH:case L.NOP:a=i(c.out),s[o]=s[c.out],n[o]=n[c.out]?n[c.out].slice():[],c.next=new Uint32Array(Math.floor(n[o].length/2)+1).fill(c.out);break;case L.MATCH:case L.FAIL:s[o]=c.op===L.MATCH;break;case L.RUNE:{if(s[o]=!1,c.next&&c.next.length>0)break;if(e.insert(c.out),!c.runes||c.runes.length===0){n[o]=[],c.next=new Uint32Array([c.out]);break}let B=[];if(c.runes.length===1&&c.arg&k.FOLD_CASE){const h=c.runes[0];B.push(h,h);for(let d=z.simpleFold(h);d!==h;d=z.simpleFold(d))B.push(d,d);B.sort((d,C)=>d-C)}else for(let h=0;h<c.runes.length;h++)B.push(c.runes[h]);n[o]=B,c.next=new Uint32Array(Math.floor(B.length/2)+1).fill(c.out),c.op=L.RUNE;break}case L.RUNE1:{if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out);let B=[];if(c.arg&k.FOLD_CASE){const h=c.runes[0];B.push(h,h);for(let d=z.simpleFold(h);d!==h;d=z.simpleFold(d))B.push(d,d);B.sort((d,C)=>d-C)}else B.push(c.runes[0],c.runes[0]);n[o]=B,c.next=new Uint32Array(Math.floor(B.length/2)+1).fill(c.out),c.op=L.RUNE;break}case L.RUNE_ANY:if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out),n[o]=[0,z.MAX_RUNE],c.next=new Uint32Array([c.out]);break;case L.RUNE_ANY_NOT_NL:if(s[o]=!1,c.next&&c.next.length>0)break;e.insert(c.out),n[o]=[0,9,11,z.MAX_RUNE],c.next=new Uint32Array(Math.floor(n[o].length/2)+1).fill(c.out);break}return a};for(e.clear(),e.insert(r.start);!e.empty();)if(t.clear(),!i(e.next()))return null;for(let o=0;o<r.inst.length;o++)n[o]&&(r.inst[o].runes=n[o]);return r},WI=(r,e)=>{for(let t=0;t<e.inst.length;t++){const n=e.inst[t];switch(n.op){case L.ALT:case L.ALT_MATCH:case L.RUNE:break;case L.CAPTURE:case L.EMPTY_WIDTH:case L.NOP:case L.MATCH:case L.FAIL:r.inst[t].next=null;break;case L.RUNE1:case L.RUNE_ANY:case L.RUNE_ANY_NOT_NL:r.inst[t].next=null,r.inst[t].op=n.op,r.inst[t].runes=n.runes?n.runes.slice():[];break}}};var Vd=class Rp{static compile(e){if(e.start===0||e.numLb>0)return null;const t=e.inst[e.start];if(t.op!==L.EMPTY_WIDTH||!(t.arg&Y.EMPTY_BEGIN_TEXT))return null;let n=!1;for(let i=0;i<e.inst.length;i++)if(e.inst[i].op===L.ALT||e.inst[i].op===L.ALT_MATCH){n=!0;break}for(let i=0;i<e.inst.length;i++){const o=e.inst[i],a=e.inst[o.out].op;switch(o.op){case L.ALT:case L.ALT_MATCH:if(a===L.MATCH||e.inst[o.arg].op===L.MATCH)return null;break;case L.EMPTY_WIDTH:if(a===L.MATCH){if((o.arg&Y.EMPTY_END_TEXT)===Y.EMPTY_END_TEXT)continue;return null}break;default:if(a===L.MATCH&&n)return null;break}}let s=$I(e);return s=QI(s),s!==null&&WI(s,e),s}static next(e,t){const n=e.matchRunePos(t);return n>=0?e.next[n]:e.op===L.ALT_MATCH?e.out:0}static execute(e,t,n,s,i){const o=e.onepass;if(!o)return null;const a=new Int32Array(i).fill(-1);let c=!1,B=t.step(n),h=B>>3,d=B&7,C=it.EOF(),I=-1,R=0;B!==it.EOF()&&(C=t.step(n+d),C!==it.EOF()&&(I=C>>3,R=C&7));let N=n===0?Y.emptyOpContext(-1,h):t.context(n),M=o.start,K;for(;;){switch(K=o.inst[M],M=K.out,K.op){case L.MATCH:return s===k.ANCHOR_BOTH&&n!==t.endPos()?null:(c=!0,a.length>0&&(a[0]=0,a[1]=n),i===0?[]:Y.toArray(a));case L.RUNE:if(!K.matchRune(h))return null;break;case L.RUNE1:if(h!==K.runes[0])return null;break;case L.RUNE_ANY:break;case L.RUNE_ANY_NOT_NL:if(h===10)return null;break;case L.ALT:case L.ALT_MATCH:M=Rp.next(K,h);continue;case L.FAIL:return null;case L.NOP:continue;case L.EMPTY_WIDTH:if(K.arg&~N)return null;continue;case L.CAPTURE:K.arg<a.length&&(a[K.arg]=n);continue;default:throw new Li("bad inst")}if(d===0)break;N=Y.emptyOpContext(h,I),n+=d,h=I,d=R,h!==-1&&(C=t.step(n+d),C!==it.EOF()?(I=C>>3,R=C&7):(I=-1,R=0))}return c?i===0?[]:Y.toArray(a):null}},A=class ee{static Op=Tp(["NO_MATCH","EMPTY_MATCH","LITERAL","CHAR_CLASS","ANY_CHAR_NOT_NL","ANY_CHAR","BEGIN_LINE","END_LINE","BEGIN_TEXT","END_TEXT","WORD_BOUNDARY","NO_WORD_BOUNDARY","CAPTURE","STAR","PLUS","QUEST","REPEAT","CONCAT","ALTERNATE","PLB","NLB","LEFT_PAREN","VERTICAL_BAR"]);static isPseudoOp(e){return e>=ee.Op.LEFT_PAREN}static emptySubs(){return[]}static quoteIfHyphen(e){return e===F.CODES.get("-")?"\\":""}static fromRegexp(e){const t=new ee(e.op);return t.flags=e.flags,t.subs=e.subs,t.runes=e.runes,t.cap=e.cap,t.min=e.min,t.max=e.max,t.name=e.name,t.namedGroups=e.namedGroups,t.lb=e.lb,t}constructor(e){this.op=e,this.flags=0,this.subs=ee.emptySubs(),this.runes=[],this.min=0,this.max=0,this.cap=0,this.name=null,this.namedGroups=Object.create(null),this.lb=0}reinit(){this.flags=0,this.subs=ee.emptySubs(),this.runes=[],this.cap=0,this.min=0,this.max=0,this.name=null,this.namedGroups=Object.create(null),this.lb=0}toString(){return this.appendTo()}appendTo(){let e="";switch(this.op){case ee.Op.NO_MATCH:e+="[^\\x00-\\x{10FFFF}]";break;case ee.Op.EMPTY_MATCH:e+="(?:)";break;case ee.Op.STAR:case ee.Op.PLUS:case ee.Op.QUEST:case ee.Op.REPEAT:{const t=this.subs[0];switch(t.op>ee.Op.CAPTURE||t.op===ee.Op.LITERAL&&t.runes.length>1?e+=`(?:${t.appendTo()})`:e+=t.appendTo(),this.op){case ee.Op.STAR:e+="*";break;case ee.Op.PLUS:e+="+";break;case ee.Op.QUEST:e+="?";break;case ee.Op.REPEAT:e+=`{${this.min}`,this.min!==this.max&&(e+=",",this.max>=0&&(e+=this.max)),e+="}";break}this.flags&k.NON_GREEDY&&(e+="?");break}case ee.Op.CONCAT:for(let t of this.subs)t.op===ee.Op.ALTERNATE?e+=`(?:${t.appendTo()})`:e+=t.appendTo();break;case ee.Op.ALTERNATE:{let t="";for(let n of this.subs)e+=t,t="|",e+=n.appendTo();break}case ee.Op.LITERAL:this.flags&k.FOLD_CASE&&(e+="(?i:");for(let t of this.runes)e+=Y.escapeRune(t);this.flags&k.FOLD_CASE&&(e+=")");break;case ee.Op.ANY_CHAR_NOT_NL:e+="(?-s:.)";break;case ee.Op.ANY_CHAR:e+="(?s:.)";break;case ee.Op.PLB:e+=`(?<=${this.subs[0].appendTo()})`;break;case ee.Op.NLB:e+=`(?<!${this.subs[0].appendTo()})`;break;case ee.Op.CAPTURE:this.name===null||this.name.length===0?e+="(":e+=`(?P<${this.name}>`,this.subs[0].op!==ee.Op.EMPTY_MATCH&&(e+=this.subs[0].appendTo()),e+=")";break;case ee.Op.BEGIN_TEXT:e+="\\A";break;case ee.Op.END_TEXT:this.flags&k.WAS_DOLLAR?e+="(?-m:$)":e+="\\z";break;case ee.Op.BEGIN_LINE:e+="^";break;case ee.Op.END_LINE:e+="$";break;case ee.Op.WORD_BOUNDARY:e+="\\b";break;case ee.Op.NO_WORD_BOUNDARY:e+="\\B";break;case ee.Op.CHAR_CLASS:if(this.runes.length%2!==0){e+="[invalid char class]";break}if(e+="[",this.runes.length===0)e+="^\\x00-\\x{10FFFF}";else if(this.runes[0]===0&&this.runes[this.runes.length-1]===z.MAX_RUNE){e+="^";for(let t=1;t<this.runes.length-1;t+=2){const n=this.runes[t]+1,s=this.runes[t+1]-1;e+=ee.quoteIfHyphen(n),e+=Y.escapeRune(n),n!==s&&(e+="-",e+=ee.quoteIfHyphen(s),e+=Y.escapeRune(s))}}else for(let t=0;t<this.runes.length;t+=2){const n=this.runes[t],s=this.runes[t+1];e+=ee.quoteIfHyphen(n),e+=Y.escapeRune(n),n!==s&&(e+="-",e+=ee.quoteIfHyphen(s),e+=Y.escapeRune(s))}e+="]";break;default:e+=this.op;break}return e}maxCap(){let e=0;if(this.op===ee.Op.CAPTURE&&(e=this.cap),this.subs!==null)for(let t of this.subs){const n=t.maxCap();e<n&&(e=n)}return e}equals(e){if(!(e!==null&&e instanceof ee)||this.op!==e.op)return!1;switch(this.op){case ee.Op.END_TEXT:if((this.flags&k.WAS_DOLLAR)!==(e.flags&k.WAS_DOLLAR))return!1;break;case ee.Op.LITERAL:case ee.Op.CHAR_CLASS:if(this.runes===null&&e.runes===null)break;if(this.runes===null||e.runes===null||this.runes.length!==e.runes.length)return!1;for(let t=0;t<this.runes.length;t++)if(this.runes[t]!==e.runes[t])return!1;break;case ee.Op.ALTERNATE:case ee.Op.CONCAT:if(this.subs.length!==e.subs.length)return!1;for(let t=0;t<this.subs.length;++t)if(!this.subs[t].equals(e.subs[t]))return!1;break;case ee.Op.STAR:case ee.Op.PLUS:case ee.Op.QUEST:if((this.flags&k.NON_GREEDY)!==(e.flags&k.NON_GREEDY)||!this.subs[0].equals(e.subs[0]))return!1;break;case ee.Op.REPEAT:if((this.flags&k.NON_GREEDY)!==(e.flags&k.NON_GREEDY)||this.min!==e.min||this.max!==e.max||!this.subs[0].equals(e.subs[0]))return!1;break;case ee.Op.CAPTURE:if(this.cap!==e.cap||(this.name===null?e.name!==null:this.name!==e.name)||!this.subs[0].equals(e.subs[0]))return!1;break;case ee.Op.PLB:case ee.Op.NLB:if(this.lb!==e.lb||!this.subs[0].equals(e.subs[0]))return!1;break}return!0}},kd=class{constructor(r){this.next=[Object.create(null)],this.fail=[0],this.match=[!1];for(const t of r){let n=0;for(let s=0;s<t.length;s++){const i=t[s];i in this.next[n]||(this.next.push(Object.create(null)),this.fail.push(0),this.match.push(!1),this.next[n][i]=this.next.length-1),n=this.next[n][i]}this.match[n]=!0}const e=[];for(const t in this.next[0])if(Object.prototype.hasOwnProperty.call(this.next[0],t)){const n=this.next[0][t];this.fail[n]=0,e.push(n)}for(;e.length>0;){const t=e.shift();for(const n in this.next[t])if(Object.prototype.hasOwnProperty.call(this.next[t],n)){const s=this.next[t][n];let i=this.fail[t];for(;i!==0&&!(n in this.next[i]);)i=this.fail[i];n in this.next[i]?this.fail[s]=this.next[i][n]:this.fail[s]=0,this.match[s]=this.match[s]||this.match[this.fail[s]],e.push(s)}}}searchUTF16(r,e,t){let n=0;for(let s=e;s<t;s++){const i=r.charCodeAt(s);for(;n!==0&&!(i in this.next[n]);)n=this.fail[n];if(i in this.next[n]&&(n=this.next[n][i]),this.match[n])return!0}return!1}searchUTF8(r,e,t){let n=0;for(let s=e;s<t;s++){const i=r[s];for(;n!==0&&!(i in this.next[n]);)n=this.fail[n];if(i in this.next[n]&&(n=this.next[n][i]),this.match[n])return!0}return!1}},Ce=class Pi{static Type={NONE:0,EXACT:1,AND:2,OR:3};constructor(e){this.type=e,this.subs=[],this.str="",this.bytes=null,this.ac16=null,this.ac8=null}eval(e,t){switch(this.type){case Pi.Type.NONE:return!0;case Pi.Type.EXACT:return e.hasString(this,t);case Pi.Type.AND:for(let n=0;n<this.subs.length;n++)if(!this.subs[n].eval(e,t))return!1;return!0;case Pi.Type.OR:if(this.ac16&&this.ac8)return e.hasAnyString(this,t);for(let n=0;n<this.subs.length;n++)if(this.subs[n].eval(e,t))return!0;return!1;default:return!0}}},YI=class an{static build(e){const t=an.fromRegexp(e);return an.simplify(t)}static fromRegexp(e){if(!e)return new Ce(Ce.Type.NONE);switch(e.op){case A.Op.PLB:case A.Op.NLB:case A.Op.NO_MATCH:case A.Op.EMPTY_MATCH:case A.Op.BEGIN_LINE:case A.Op.END_LINE:case A.Op.BEGIN_TEXT:case A.Op.END_TEXT:case A.Op.WORD_BOUNDARY:case A.Op.NO_WORD_BOUNDARY:case A.Op.CHAR_CLASS:case A.Op.ANY_CHAR_NOT_NL:case A.Op.ANY_CHAR:return new Ce(Ce.Type.NONE);case A.Op.LITERAL:{if(e.runes.length===0||e.flags&k.FOLD_CASE)return new Ce(Ce.Type.NONE);const t=new Ce(Ce.Type.EXACT);let n="";for(let s=0;s<e.runes.length;s++)n+=String.fromCodePoint(e.runes[s]);return t.str=n,t.bytes=Y.stringToUtf8ByteArray(t.str),t}case A.Op.CAPTURE:case A.Op.PLUS:return an.fromRegexp(e.subs[0]);case A.Op.REPEAT:return e.min>=1?an.fromRegexp(e.subs[0]):new Ce(Ce.Type.NONE);case A.Op.CONCAT:{const t=new Ce(Ce.Type.AND);for(const n of e.subs)t.subs.push(an.fromRegexp(n));return t}case A.Op.ALTERNATE:{const t=new Ce(Ce.Type.OR);for(const n of e.subs)t.subs.push(an.fromRegexp(n));return t}default:return new Ce(Ce.Type.NONE)}}static simplify(e){if(e.type===Ce.Type.EXACT||e.type===Ce.Type.NONE)return e;if(e.type===Ce.Type.AND){const t=[];for(const n of e.subs){const s=an.simplify(n);if(s.type!==Ce.Type.NONE)if(s.type===Ce.Type.AND)for(let i=0;i<s.subs.length;i++)t.push(s.subs[i]);else t.push(s)}return t.length===0?new Ce(Ce.Type.NONE):t.length===1?t[0]:(e.subs=t,e)}if(e.type===Ce.Type.OR){const t=[];for(const o of e.subs){const a=an.simplify(o);if(a.type===Ce.Type.NONE)return new Ce(Ce.Type.NONE);if(a.type===Ce.Type.OR)for(let c=0;c<a.subs.length;c++)t.push(a.subs[c]);else t.push(a)}if(t.length===0)return new Ce(Ce.Type.NONE);if(t.length===1)return t[0];const n=new Set,s=[];for(const o of t)o.type===Ce.Type.EXACT?n.has(o.str)||(n.add(o.str),s.push(o)):s.push(o);e.subs=s;let i=!0;for(const o of s)if(o.type!==Ce.Type.EXACT){i=!1;break}return i&&s.length>1&&(e.ac16=new kd(s.map(o=>{const a=[];for(let c=0;c<o.str.length;c++)a.push(o.str.charCodeAt(c));return a})),e.ac8=new kd(s.map(o=>o.bytes))),e}return e}},bt=class{constructor(r=0,e=0){this.head=r,this.tail=e}},XI=class{constructor(){this.inst=[],this.start=0,this.numCap=2,this.lbStarts=[],this.numLb=0}getInst(r){return this.inst[r]}numInst(){return this.inst.length}addInst(r){this.inst.push(new L(r))}skipNop(r){let e=this.inst[r];for(;e.op===L.NOP||e.op===L.CAPTURE;)e=this.inst[r],r=e.out;return e}prefix(){let r="",e=this.skipNop(this.start);if(!L.isRuneOp(e.op)||e.runes.length!==1)return[e.op===L.MATCH,r];for(;L.isRuneOp(e.op)&&e.runes.length===1&&!(e.arg&k.FOLD_CASE);)r+=String.fromCodePoint(e.runes[0]),e=this.skipNop(e.out);return[e.op===L.MATCH,r]}startCond(){let r=0,e=this.start;e:for(;;){const t=this.inst[e];switch(t.op){case L.EMPTY_WIDTH:r|=t.arg;break;case L.FAIL:return-1;case L.CAPTURE:case L.NOP:break;default:break e}e=t.out}return r}patch(r,e){let t=r.head;for(;t!==0;){const n=this.inst[t>>1];t&1?(t=n.arg,n.arg=e):(t=n.out,n.out=e)}}append(r,e){if(r.head===0)return e;if(e.head===0)return r;const t=this.inst[r.tail>>1];return r.tail&1?t.arg=e.head:t.out=e.head,new bt(r.head,e.tail)}toString(){let r="";for(let e=0;e<this.inst.length;e++){const t=r.length;r+=e,e===this.start&&(r+="*"),r+="        ".substring(r.length-t),r+=this.inst[e],r+=`
`}return r}},ia=class{constructor(r=0,e=new bt,t=!1){this.i=r,this.out=e,this.nullable=t}},ZI=class ds{static ANY_RUNE_NOT_NL(){return[0,F.CODES.get(`
`)-1,F.CODES.get(`
`)+1,z.MAX_RUNE]}static ANY_RUNE(){return[0,z.MAX_RUNE]}static compileRegexp(e){const t=new ds,n=t.compile(e);return t.prog.patch(n.out,t.newInst(L.MATCH).i),t.prog.start=n.i,t.prog}static compileSet(e){const t=new ds;if(e.length===0)return t.prog.start=t.newInst(L.FAIL).i,t.prog;let n=[];for(let i=0;i<e.length;i++){const o=t.compile(e[i]),a=t.newInst(L.MATCH);t.prog.getInst(a.i).arg=i,t.prog.patch(o.out,a.i),n.push(o.i)}let s=n[0];for(let i=1;i<n.length;i++){const o=t.newInst(L.ALT),a=t.prog.getInst(o.i);a.out=s,a.arg=n[i],s=o.i}return t.prog.start=s,t.prog}constructor(){this.prog=new XI,this.newInst(L.FAIL)}newInst(e){return this.prog.addInst(e),new ia(this.prog.numInst()-1,new bt,!0)}nop(){const e=this.newInst(L.NOP);return e.out=new bt(e.i<<1,e.i<<1),e}fail(){return new ia}cap(e){const t=this.newInst(L.CAPTURE);return t.out=new bt(t.i<<1,t.i<<1),this.prog.getInst(t.i).arg=e,this.prog.numCap<e+1&&(this.prog.numCap=e+1),t}cat(e,t){return e.i===0||t.i===0?this.fail():(this.prog.patch(e.out,t.i),new ia(e.i,t.out,e.nullable&&t.nullable))}alt(e,t){if(e.i===0)return t;if(t.i===0)return e;const n=this.newInst(L.ALT),s=this.prog.getInst(n.i);return s.out=e.i,s.arg=t.i,n.out=this.prog.append(e.out,t.out),n.nullable=e.nullable||t.nullable,n}loop(e,t){const n=this.newInst(L.ALT),s=this.prog.getInst(n.i);return t?(s.arg=e.i,n.out=new bt(n.i<<1,n.i<<1)):(s.out=e.i,n.out=new bt(n.i<<1|1,n.i<<1|1)),this.prog.patch(e.out,n.i),n}quest(e,t){const n=this.newInst(L.ALT),s=this.prog.getInst(n.i);return t?(s.arg=e.i,n.out=new bt(n.i<<1,n.i<<1)):(s.out=e.i,n.out=new bt(n.i<<1|1,n.i<<1|1)),n.out=this.prog.append(n.out,e.out),n}star(e,t){return e.nullable?this.quest(this.plus(e,t),t):this.loop(e,t)}plus(e,t){return new ia(e.i,this.loop(e,t).out,e.nullable)}empty(e){const t=this.newInst(L.EMPTY_WIDTH);return this.prog.getInst(t.i).arg=e,t.out=new bt(t.i<<1,t.i<<1),t}rune(e,t){const n=this.newInst(L.RUNE);n.nullable=!1;const s=this.prog.getInst(n.i);return s.runes=e,t&=k.FOLD_CASE,(e.length!==1||z.simpleFold(e[0])===e[0])&&(t&=-2),s.arg=t,n.out=new bt(n.i<<1,n.i<<1),!(t&k.FOLD_CASE)&&e.length===1||e.length===2&&e[0]===e[1]?s.op=L.RUNE1:e.length===2&&e[0]===0&&e[1]===z.MAX_RUNE?s.op=L.RUNE_ANY:e.length===4&&e[0]===0&&e[1]===F.CODES.get(`
`)-1&&e[2]===F.CODES.get(`
`)+1&&e[3]===z.MAX_RUNE&&(s.op=L.RUNE_ANY_NOT_NL),n}lookBehind(e,t){const n=this.newInst(L.LB_WRITE);this.prog.getInst(n.i).arg=t;const s=this.rune(ds.ANY_RUNE(),0),i=this.star(s,!0),o=this.cat(i,e);this.prog.patch(o.out,n.i);const a=this.newInst(L.LB_CHECK);return this.prog.getInst(a.i).arg=t,this.prog.lbStarts.push(o.i),Math.abs(t)>this.prog.numLb&&(this.prog.numLb=Math.abs(t)),a.out=new bt(a.i<<1,a.i<<1),a}compile(e){switch(e.op){case A.Op.NO_MATCH:return this.fail();case A.Op.EMPTY_MATCH:return this.nop();case A.Op.LITERAL:if(e.runes.length===0)return this.nop();{let t=null;for(let n of e.runes){const s=this.rune([n],e.flags);t=t===null?s:this.cat(t,s)}return t}case A.Op.CHAR_CLASS:return this.rune(e.runes,e.flags);case A.Op.ANY_CHAR_NOT_NL:return this.rune(ds.ANY_RUNE_NOT_NL(),0);case A.Op.ANY_CHAR:return this.rune(ds.ANY_RUNE(),0);case A.Op.BEGIN_LINE:return this.empty(Y.EMPTY_BEGIN_LINE);case A.Op.END_LINE:return this.empty(Y.EMPTY_END_LINE);case A.Op.BEGIN_TEXT:return this.empty(Y.EMPTY_BEGIN_TEXT);case A.Op.END_TEXT:return this.empty(Y.EMPTY_END_TEXT);case A.Op.WORD_BOUNDARY:return this.empty(Y.EMPTY_WORD_BOUNDARY);case A.Op.NO_WORD_BOUNDARY:return this.empty(Y.EMPTY_NO_WORD_BOUNDARY);case A.Op.PLB:case A.Op.NLB:return this.lookBehind(this.compile(e.subs[0]),e.lb);case A.Op.CAPTURE:{const t=this.cap(e.cap<<1),n=this.compile(e.subs[0]),s=this.cap(e.cap<<1|1);return this.cat(this.cat(t,n),s)}case A.Op.STAR:return this.star(this.compile(e.subs[0]),(e.flags&k.NON_GREEDY)!==0);case A.Op.PLUS:return this.plus(this.compile(e.subs[0]),(e.flags&k.NON_GREEDY)!==0);case A.Op.QUEST:return this.quest(this.compile(e.subs[0]),(e.flags&k.NON_GREEDY)!==0);case A.Op.CONCAT:if(e.subs.length===0)return this.nop();{let t=null;for(let n of e.subs){const s=this.compile(n);t=t===null?s:this.cat(t,s)}return t}case A.Op.ALTERNATE:if(e.subs.length===0)return this.nop();{let t=null;for(let n of e.subs){const s=this.compile(n);t=t===null?s:this.alt(t,s)}return t}default:throw new xI("regexp: unhandled case in compile")}}},ey=class gt{static simplify(e){if(e===null)return null;switch(e.op){case A.Op.PLB:case A.Op.NLB:case A.Op.CAPTURE:{const t=gt.simplify(e.subs[0]);if(t!==e.subs[0]){const n=A.fromRegexp(e);return n.runes=[],n.subs=[t],n}return e}case A.Op.CONCAT:case A.Op.ALTERNATE:{const t=[];let n=!1;for(let s=0;s<e.subs.length;s++){const i=e.subs[s],o=gt.simplify(i);if(o!==i&&(n=!0),e.op===A.Op.CONCAT){if(o.op===A.Op.NO_MATCH)return new A(A.Op.NO_MATCH);if(o.op===A.Op.EMPTY_MATCH){n=!0;continue}if(o.op===A.Op.CONCAT){n=!0;for(let a=0;a<o.subs.length;a++)t.push(o.subs[a]);continue}}else if(e.op===A.Op.ALTERNATE){if(o.op===A.Op.NO_MATCH){n=!0;continue}if(o.op===A.Op.ALTERNATE){n=!0;for(let a=0;a<o.subs.length;a++)t.push(o.subs[a]);continue}}t.push(o)}if(n){if(t.length===0)return new A(e.op===A.Op.CONCAT?A.Op.EMPTY_MATCH:A.Op.NO_MATCH);if(t.length===1)return t[0];const s=A.fromRegexp(e);return s.runes=[],s.subs=t,s}return e}case A.Op.CHAR_CLASS:return e.runes===null?e:e.runes.length===0?new A(A.Op.NO_MATCH):e.runes.length===2&&e.runes[0]===0&&e.runes[1]===z.MAX_RUNE?new A(A.Op.ANY_CHAR):e.runes.length===4&&e.runes[0]===0&&e.runes[1]===F.CODES.get(`
`)-1&&e.runes[2]===F.CODES.get(`
`)+1&&e.runes[3]===z.MAX_RUNE?new A(A.Op.ANY_CHAR_NOT_NL):e;case A.Op.STAR:case A.Op.PLUS:case A.Op.QUEST:{const t=gt.simplify(e.subs[0]);return gt.simplify1(e.op,e.flags,t,e)}case A.Op.REPEAT:{if(e.min===0&&e.max===0)return new A(A.Op.EMPTY_MATCH);const t=gt.simplify(e.subs[0]);if(e.max===-1){if(e.min===0)return gt.simplify1(A.Op.STAR,e.flags,t,null);if(e.min===1)return gt.simplify1(A.Op.PLUS,e.flags,t,null);const s=new A(A.Op.CONCAT),i=[];for(let o=0;o<e.min-1;o++)i.push(t);return i.push(gt.simplify1(A.Op.PLUS,e.flags,t,null)),s.subs=i.slice(0),gt.simplify(s)}if(e.min===1&&e.max===1)return t;let n=null;if(e.min>0){n=[];for(let s=0;s<e.min;s++)n.push(t)}if(e.max>e.min){let s=gt.simplify1(A.Op.QUEST,e.flags,t,null);for(let i=e.min+1;i<e.max;i++){const o=new A(A.Op.CONCAT);o.subs=[t,s],s=gt.simplify1(A.Op.QUEST,e.flags,o,null)}if(n===null)return s;n.push(s)}if(n!==null){const s=new A(A.Op.CONCAT);return s.subs=n.slice(0),gt.simplify(s)}return new A(A.Op.NO_MATCH)}}return e}static simplify1(e,t,n,s){if(n.op===A.Op.EMPTY_MATCH)return n;if(n.op===A.Op.NO_MATCH)return e===A.Op.PLUS?n:new A(A.Op.EMPTY_MATCH);if(e===n.op&&(t&k.NON_GREEDY)===(n.flags&k.NON_GREEDY))return n;if(s!==null&&s.op===e&&(s.flags&k.NON_GREEDY)===(t&k.NON_GREEDY)&&n===s.subs[0])return s;const i=new A(e);return i.flags=t,i.subs=[n],i}},de=class{constructor(r,e){this.sign=r,this.cls=e}};const Md=[48,57],Gd=[9,10,12,13,32,32],Ud=[48,57,65,90,95,95,97,122],Hd=new Map([["\\d",new de(1,Md)],["\\D",new de(-1,Md)],["\\s",new de(1,Gd)],["\\S",new de(-1,Gd)],["\\w",new de(1,Ud)],["\\W",new de(-1,Ud)]]),jd=[48,57,65,90,97,122],qd=[65,90,97,122],Jd=[0,127],Kd=[9,9,32,32],zd=[0,31,127,127],$d=[48,57],Qd=[33,126],Wd=[97,122],Yd=[32,126],Xd=[33,47,58,64,91,96,123,126],Zd=[9,13,32,32],ef=[65,90],tf=[48,57,65,90,95,95,97,122],nf=[48,57,65,70,97,102],rf=new Map([["[:alnum:]",new de(1,jd)],["[:^alnum:]",new de(-1,jd)],["[:alpha:]",new de(1,qd)],["[:^alpha:]",new de(-1,qd)],["[:ascii:]",new de(1,Jd)],["[:^ascii:]",new de(-1,Jd)],["[:blank:]",new de(1,Kd)],["[:^blank:]",new de(-1,Kd)],["[:cntrl:]",new de(1,zd)],["[:^cntrl:]",new de(-1,zd)],["[:digit:]",new de(1,$d)],["[:^digit:]",new de(-1,$d)],["[:graph:]",new de(1,Qd)],["[:^graph:]",new de(-1,Qd)],["[:lower:]",new de(1,Wd)],["[:^lower:]",new de(-1,Wd)],["[:print:]",new de(1,Yd)],["[:^print:]",new de(-1,Yd)],["[:punct:]",new de(1,Xd)],["[:^punct:]",new de(-1,Xd)],["[:space:]",new de(1,Zd)],["[:^space:]",new de(-1,Zd)],["[:upper:]",new de(1,ef)],["[:^upper:]",new de(-1,ef)],["[:word:]",new de(1,tf)],["[:^word:]",new de(-1,tf)],["[:xdigit:]",new de(1,nf)],["[:^xdigit:]",new de(-1,nf)]]);var Sn=class Vn{static charClassToString(e,t){let n="[";for(let s=0;s<t;s+=2){s>0&&(n+=" ");const i=e[s],o=e[s+1];i===o?n+=`0x${i.toString(16)}`:n+=`0x${i.toString(16)}-0x${o.toString(16)}`}return n+="]",n}static cmp(e,t,n,s){const i=e[t]-n;return i!==0?i:s-e[t+1]}static qsortIntPair(e,t,n){const s=((t+n)/2|0)&-2,i=e[s],o=e[s+1];let a=t,c=n;for(;a<=c;){for(;a<n&&Vn.cmp(e,a,i,o)<0;)a+=2;for(;c>t&&Vn.cmp(e,c,i,o)>0;)c-=2;if(a<=c){if(a!==c){let B=e[a];e[a]=e[c],e[c]=B,B=e[a+1],e[a+1]=e[c+1],e[c+1]=B}a+=2,c-=2}}t<c&&Vn.qsortIntPair(e,t,c),a<n&&Vn.qsortIntPair(e,a,n)}constructor(e=Y.emptyInts()){this.r=e,this.len=e.length}toArray(){return this.len===this.r.length?this.r:this.r.slice(0,this.len)}cleanClass(){if(this.len<4)return this;Vn.qsortIntPair(this.r,0,this.len-2);let e=2;for(let t=2;t<this.len;t+=2){const n=this.r[t],s=this.r[t+1];if(n<=this.r[e-1]+1){s>this.r[e-1]&&(this.r[e-1]=s);continue}this.r[e]=n,this.r[e+1]=s,e+=2}return this.len=e,this}appendLiteral(e,t){return t&k.FOLD_CASE?this.appendFoldedRange(e,e):this.appendRange(e,e)}appendRange(e,t){if(this.len>0){for(let n=2;n<=4;n+=2)if(this.len>=n){const s=this.r[this.len-n],i=this.r[this.len-n+1];if(e<=i+1&&s<=t+1)return e<s&&(this.r[this.len-n]=e),t>i&&(this.r[this.len-n+1]=t),this}}return this.r[this.len++]=e,this.r[this.len++]=t,this}appendFoldedRange(e,t){if(e<=z.MIN_FOLD&&t>=z.MAX_FOLD)return this.appendRange(e,t);if(t<z.MIN_FOLD||e>z.MAX_FOLD)return this.appendRange(e,t);e<z.MIN_FOLD&&(this.appendRange(e,z.MIN_FOLD-1),e=z.MIN_FOLD),t>z.MAX_FOLD&&(this.appendRange(z.MAX_FOLD+1,t),t=z.MAX_FOLD);for(let n=e;n<=t;n++){this.appendRange(n,n);for(let s=z.simpleFold(n);s!==n;s=z.simpleFold(s))this.appendRange(s,s)}return this}appendClass(e){for(let t=0;t<e.length;t+=2)this.appendRange(e[t],e[t+1]);return this}appendFoldedClass(e){for(let t=0;t<e.length;t+=2)this.appendFoldedRange(e[t],e[t+1]);return this}appendNegatedClass(e){let t=0;for(let n=0;n<e.length;n+=2){const s=e[n],i=e[n+1];t<=s-1&&this.appendRange(t,s-1),t=i+1}return t<=z.MAX_RUNE&&this.appendRange(t,z.MAX_RUNE),this}appendTable(e){for(let t=0;t<e.length;++t){const n=e.getLo(t),s=e.getHi(t),i=e.getStride(t);if(i===1){this.appendRange(n,s);continue}for(let o=n;o<=s;o+=i)this.appendRange(o,o)}return this}appendNegatedTable(e){let t=0;for(let n=0;n<e.length;++n){const s=e.getLo(n),i=e.getHi(n),o=e.getStride(n);if(o===1){t<=s-1&&this.appendRange(t,s-1),t=i+1;continue}for(let a=s;a<=i;a+=o)t<=a-1&&this.appendRange(t,a-1),t=a+1}return t<=z.MAX_RUNE&&this.appendRange(t,z.MAX_RUNE),this}appendTableWithSign(e,t){return t<0?this.appendNegatedTable(e):this.appendTable(e)}negateClass(){let e=0,t=0;for(let n=0;n<this.len;n+=2){const s=this.r[n],i=this.r[n+1];e<=s-1&&(this.r[t]=e,this.r[t+1]=s-1,t+=2),e=i+1}return this.len=t,e<=z.MAX_RUNE&&(this.r[this.len++]=e,this.r[this.len++]=z.MAX_RUNE),this}appendClassWithSign(e,t){return t<0?this.appendNegatedClass(e):this.appendClass(e)}appendGroup(e,t){let n=e.cls;return t&&(n=new Vn().appendFoldedClass(n).cleanClass().toArray()),this.appendClassWithSign(n,e.sign)}toString(){return Vn.charClassToString(this.r,this.len)}},ty=class{constructor(r){this.str=r,this.position=0}pos(){return this.position}rewindTo(r){this.position=r}more(){return this.position<this.str.length}peek(){return this.str.codePointAt(this.position)}skip(r){this.position+=r}skipString(r){this.position+=r.length}pop(){const r=this.str.codePointAt(this.position);return this.position+=Y.charCount(r),r}lookingAt(r){return this.str.startsWith(r,this.position)}rest(){return this.str.substring(this.position)}from(r){return this.str.substring(r,this.position)}toString(){return this.rest()}},ny=class W{static ERR_INTERNAL_ERROR="regexp/syntax: internal error";static ERR_INVALID_CHAR_RANGE="invalid character class range";static ERR_INVALID_ESCAPE="invalid escape sequence";static ERR_INVALID_NAMED_CAPTURE="invalid named capture";static ERR_INVALID_PERL_OP="invalid or unsupported Perl syntax";static ERR_INVALID_REPEAT_OP="invalid nested repetition operator";static ERR_INVALID_REPEAT_SIZE="invalid repeat count";static ERR_MISSING_BRACKET="missing closing ]";static ERR_MISSING_PAREN="missing closing )";static ERR_MISSING_REPEAT_ARGUMENT="missing argument to repetition operator";static ERR_TRAILING_BACKSLASH="trailing backslash at end of expression";static ERR_DUPLICATE_NAMED_CAPTURE="duplicate capture group name";static ERR_UNEXPECTED_PAREN="unexpected )";static ERR_NESTING_DEPTH="expression nests too deeply";static ERR_LARGE="expression too large";static ERR_INVALID_CAPTURE_IN_LOOKBEHIND="invalid capture in lookbehind";static MAX_HEIGHT=1e3;static MAX_SIZE=3355443;static MAX_RUNES=33554432;static ANY_TABLE=new g(new Uint32Array([0,z.MAX_RUNE,1]));static ASCII_TABLE=new g(new Uint32Array([0,127,1]));static ASCII_FOLD_TABLE=new g(new Uint32Array([0,127,1,383,383,1,8490,8490,1]));static unicodeTable(e){return e==="Any"?{tab:W.ANY_TABLE,fold:W.ANY_TABLE,sign:1}:e==="Ascii"?{tab:W.ASCII_TABLE,fold:W.ASCII_FOLD_TABLE,sign:1}:e==="Assigned"?{tab:ct.CATEGORIES.get("Cn"),fold:ct.CATEGORIES.get("Cn"),sign:-1}:e==="Lc"?{tab:ct.CATEGORIES.get("LC"),fold:ct.FOLD_CATEGORIES.get("LC"),sign:1}:ct.CATEGORIES.has(e)?{tab:ct.CATEGORIES.get(e),fold:ct.FOLD_CATEGORIES.get(e),sign:1}:ct.SCRIPTS.has(e)?{tab:ct.SCRIPTS.get(e),fold:ct.FOLD_SCRIPT.get(e),sign:1}:null}static minFoldRune(e){if(e<z.MIN_FOLD||e>z.MAX_FOLD)return e;let t=e;const n=e;for(e=z.simpleFold(e);e!==n;e=z.simpleFold(e))t>e&&(t=e);return t}static leadingRegexp(e){if(e.op===A.Op.EMPTY_MATCH)return null;if(e.op===A.Op.CONCAT&&e.subs.length>0){const t=e.subs[0];return t.op===A.Op.EMPTY_MATCH?null:t}return e}static literalRegexp(e,t){const n=new A(A.Op.LITERAL);return n.flags=t,n.runes=Y.stringToRunes(e),n}static parse(e,t){return new W(e,t).parseInternal()}static parseRepeat(e){const t=e.pos();if(!e.more()||!e.lookingAt("{"))return-1;e.skip(1);const n=W.parseInt(e);if(n===-1||!e.more())return-1;let s;if(!e.lookingAt(","))s=n;else{if(e.skip(1),!e.more())return-1;if(e.lookingAt("}"))s=-1;else if((s=W.parseInt(e))===-1)return-1}if(!e.more()||!e.lookingAt("}"))return-1;if(e.skip(1),n<0||n>1e3||s===-2||s>1e3||s>=0&&n>s)throw new De(W.ERR_INVALID_REPEAT_SIZE,e.from(t));return n<<16|s&z.MAX_BMP}static isValidCaptureName(e){if(e.length===0)return!1;for(let t=0;t<e.length;t++){const n=e.codePointAt(t);if(n!==F.CODES.get("_")&&!Y.isalnum(n))return!1}return!0}static parseInt(e){const t=e.pos();for(;e.more()&&e.peek()>=F.CODES.get("0")&&e.peek()<=F.CODES.get("9");)e.skip(1);const n=e.from(t);return n.length===0||n.length>1&&n.codePointAt(0)===F.CODES.get("0")?-1:n.length>8?-2:parseInt(n,10)}static isCharClass(e){return e.op===A.Op.LITERAL&&e.runes.length===1||e.op===A.Op.CHAR_CLASS||e.op===A.Op.ANY_CHAR_NOT_NL||e.op===A.Op.ANY_CHAR}static matchRune(e,t){switch(e.op){case A.Op.LITERAL:return e.runes.length===1&&e.runes[0]===t;case A.Op.CHAR_CLASS:for(let n=0;n<e.runes.length;n+=2)if(e.runes[n]<=t&&t<=e.runes[n+1])return!0;return!1;case A.Op.ANY_CHAR_NOT_NL:return t!==F.CODES.get(`
`);case A.Op.ANY_CHAR:return!0}return!1}static mergeCharClass(e,t){switch(e.op){case A.Op.ANY_CHAR:break;case A.Op.ANY_CHAR_NOT_NL:W.matchRune(t,F.CODES.get(`
`))&&(e.op=A.Op.ANY_CHAR);break;case A.Op.CHAR_CLASS:t.op===A.Op.LITERAL?e.runes=new Sn(e.runes).appendLiteral(t.runes[0],t.flags).toArray():e.runes=new Sn(e.runes).appendClass(t.runes).toArray();break;case A.Op.LITERAL:if(t.runes[0]===e.runes[0]&&t.flags===e.flags)break;e.op=A.Op.CHAR_CLASS,e.runes=new Sn().appendLiteral(e.runes[0],e.flags).appendLiteral(t.runes[0],t.flags).toArray();break}}static parseEscape(e){const t=e.pos();if(e.skip(1),!e.more())throw new De(W.ERR_TRAILING_BACKSLASH);let n=e.pop();e:switch(n){case F.CODES.get("1"):case F.CODES.get("2"):case F.CODES.get("3"):case F.CODES.get("4"):case F.CODES.get("5"):case F.CODES.get("6"):case F.CODES.get("7"):if(!e.more()||e.peek()<F.CODES.get("0")||e.peek()>F.CODES.get("7"))break;case F.CODES.get("0"):{let s=n-F.CODES.get("0");for(let i=1;i<3&&!(!e.more()||e.peek()<F.CODES.get("0")||e.peek()>F.CODES.get("7"));i++)s=s*8+e.peek()-F.CODES.get("0"),e.skip(1);return s}case F.CODES.get("x"):{if(!e.more())break;if(n=e.pop(),n===F.CODES.get("{")){let o=0,a=0;for(;;){if(!e.more())break e;if(n=e.pop(),n===F.CODES.get("}"))break;const c=Y.unhex(n);if(c<0||(a=a*16+c,a>z.MAX_RUNE))break e;o++}if(o===0)break e;return a}const s=Y.unhex(n);if(!e.more())break;n=e.pop();const i=Y.unhex(n);if(s<0||i<0)break;return s*16+i}case F.CODES.get("a"):return F.CODES.get("\x07");case F.CODES.get("f"):return F.CODES.get("\f");case F.CODES.get("n"):return F.CODES.get(`
`);case F.CODES.get("r"):return F.CODES.get("\r");case F.CODES.get("t"):return F.CODES.get("	");case F.CODES.get("v"):return F.CODES.get("\v");default:if(n<=z.MAX_ASCII&&!Y.isalnum(n))return n;break}throw new De(W.ERR_INVALID_ESCAPE,e.from(t))}static parseClassChar(e,t){if(!e.more())throw new De(W.ERR_MISSING_BRACKET,e.from(t));return e.lookingAt("\\")?W.parseEscape(e):e.pop()}static concatRunes(e,t){for(let n=0;n<t.length;n++)e.push(t[n]);return e}static hasCapture(e){if(e===null)return!1;if(e.op===A.Op.CAPTURE)return!0;if(e.subs){for(let t of e.subs)if(W.hasCapture(t))return!0}return!1}constructor(e,t=0){this.wholeRegexp=e,this.flags=t,this.numCap=0,this.namedGroups=Object.create(null),this.stack=[],this.free=null,this.numRegexp=0,this.numRunes=0,this.repeats=0,this.height=null,this.size=null,this.nlb=0}newRegexp(e){let t=this.free;return t!==null&&t.subs!==null&&t.subs.length>0?(this.free=t.subs[0],t.reinit(),t.op=e):(t=new A(e),this.numRegexp+=1),t}reuse(e){this.height!==null&&this.height.has(e)&&this.height.delete(e),e.subs!==null&&e.subs.length>0&&(e.subs[0]=this.free),this.free=e}checkLimits(e){if(this.numRunes>W.MAX_RUNES)throw new De(W.ERR_LARGE);this.checkSize(e),this.checkHeight(e)}checkSize(e){if(this.size===null){if(this.repeats===0&&(this.repeats=1),e.op===A.Op.REPEAT){let t=e.max;t===-1&&(t=e.min),t<=0&&(t=1),t>Math.floor(W.MAX_SIZE/this.repeats)?this.repeats=W.MAX_SIZE:this.repeats*=t}if(this.numRegexp<Math.floor(W.MAX_SIZE/this.repeats))return;this.size=new Map;for(let t of this.stack)this.checkSize(t)}if(this.calcSize(e,!0)>W.MAX_SIZE)throw new De(W.ERR_LARGE)}calcSize(e,t=!1){if(!t&&this.size!==null&&this.size.has(e))return this.size.get(e);let n=0;switch(e.op){case A.Op.LITERAL:n=e.runes.length;break;case A.Op.PLB:case A.Op.NLB:case A.Op.CAPTURE:case A.Op.STAR:n=2+this.calcSize(e.subs[0]);break;case A.Op.PLUS:case A.Op.QUEST:n=1+this.calcSize(e.subs[0]);break;case A.Op.CONCAT:for(let s of e.subs)n=n+this.calcSize(s);break;case A.Op.ALTERNATE:for(let s of e.subs)n=n+this.calcSize(s);e.subs.length>1&&(n=n+e.subs.length-1);break;case A.Op.REPEAT:{let s=this.calcSize(e.subs[0]);if(e.max===-1){e.min===0?n=2+s:n=1+e.min*s;break}n=e.max*s+(e.max-e.min);break}}return n=Math.max(1,n),this.size===null&&(this.size=new Map),this.size.set(e,n),n}checkHeight(e){if(!(this.numRegexp<W.MAX_HEIGHT)){if(this.height===null){this.height=new Map;for(let t of this.stack)this.checkHeight(t)}if(this.calcHeight(e,!0)>W.MAX_HEIGHT)throw new De(W.ERR_NESTING_DEPTH)}}calcHeight(e,t=!1){if(!t&&this.height!==null&&this.height.has(e))return this.height.get(e);let n=1;for(let s of e.subs){const i=this.calcHeight(s);n<1+i&&(n=1+i)}return this.height===null&&(this.height=new Map),this.height.set(e,n),n}pop(){return this.stack.pop()}popToPseudo(){const e=this.stack.length;let t=e;for(;t>0&&!A.isPseudoOp(this.stack[t-1].op);)t--;const n=this.stack.slice(t,e);return this.stack=this.stack.slice(0,t),n}push(e){if(this.numRunes+=e.runes.length,e.op===A.Op.CHAR_CLASS&&e.runes.length===2&&e.runes[0]===e.runes[1]){if(this.maybeConcat(e.runes[0],this.flags&-2))return null;e.op=A.Op.LITERAL,e.runes=[e.runes[0]],e.flags=this.flags&-2}else if(e.op===A.Op.CHAR_CLASS&&e.runes.length===4&&e.runes[0]===e.runes[1]&&e.runes[2]===e.runes[3]&&z.simpleFold(e.runes[0])===e.runes[2]&&z.simpleFold(e.runes[2])===e.runes[0]||e.op===A.Op.CHAR_CLASS&&e.runes.length===2&&e.runes[0]+1===e.runes[1]&&z.simpleFold(e.runes[0])===e.runes[1]&&z.simpleFold(e.runes[1])===e.runes[0]){if(this.maybeConcat(e.runes[0],this.flags|k.FOLD_CASE))return null;e.op=A.Op.LITERAL,e.runes=[e.runes[0]],e.flags=this.flags|k.FOLD_CASE}else this.maybeConcat(-1,0);return this.stack.push(e),this.checkLimits(e),e}maybeConcat(e,t){const n=this.stack.length;if(n<2)return!1;const s=this.stack[n-1],i=this.stack[n-2];return s.op!==A.Op.LITERAL||i.op!==A.Op.LITERAL||(s.flags&k.FOLD_CASE)!==(i.flags&k.FOLD_CASE)?!1:(i.runes=W.concatRunes(i.runes,s.runes),e>=0?(s.runes=[e],s.flags=t,!0):(this.pop(),this.reuse(s),!1))}newLiteral(e,t){const n=this.newRegexp(A.Op.LITERAL);return n.flags=t,t&k.FOLD_CASE&&(e=W.minFoldRune(e)),n.runes=[e],n}literal(e){this.push(this.newLiteral(e,this.flags))}op(e){const t=this.newRegexp(e);return t.flags=this.flags,this.push(t)}repeat(e,t,n,s,i,o){let a=this.flags;if(a&k.PERL_X&&(i.more()&&i.lookingAt("?")&&(i.skip(1),a^=k.NON_GREEDY),o!==-1))throw new De(W.ERR_INVALID_REPEAT_OP,i.from(o));const c=this.stack.length;if(c===0)throw new De(W.ERR_MISSING_REPEAT_ARGUMENT,i.from(s));const B=this.stack[c-1];if(A.isPseudoOp(B.op))throw new De(W.ERR_MISSING_REPEAT_ARGUMENT,i.from(s));const h=this.newRegexp(e);if(h.min=t,h.max=n,h.flags=a,h.subs=[B],this.stack[c-1]=h,this.checkLimits(h),e===A.Op.REPEAT&&(t>=2||n>=2)&&!this.repeatIsValid(h,1e3))throw new De(W.ERR_INVALID_REPEAT_SIZE,i.from(s))}repeatIsValid(e,t){if(e.op===A.Op.REPEAT){let n=e.max;if(n===0)return!0;if(n<0&&(n=e.min),n>t)return!1;n>0&&(t=Math.trunc(t/n))}for(let n of e.subs)if(!this.repeatIsValid(n,t))return!1;return!0}concat(){this.maybeConcat(-1,0);const e=this.popToPseudo();return e.length===0?this.push(this.newRegexp(A.Op.EMPTY_MATCH)):this.push(this.collapse(e,A.Op.CONCAT))}alternate(){const e=this.popToPseudo();return e.length>0&&this.cleanAlt(e[e.length-1]),e.length===0?this.push(this.newRegexp(A.Op.NO_MATCH)):this.push(this.collapse(e,A.Op.ALTERNATE))}cleanAlt(e){e.op===A.Op.CHAR_CLASS&&(e.runes=new Sn(e.runes).cleanClass().toArray(),e.runes.length===2&&e.runes[0]===0&&e.runes[1]===z.MAX_RUNE?(e.runes=[],e.op=A.Op.ANY_CHAR):e.runes.length===4&&e.runes[0]===0&&e.runes[1]===F.CODES.get(`
`)-1&&e.runes[2]===F.CODES.get(`
`)+1&&e.runes[3]===z.MAX_RUNE&&(e.runes=[],e.op=A.Op.ANY_CHAR_NOT_NL))}collapse(e,t){if(e.length===1)return e[0];let n=0;for(let a of e)n+=a.op===t?a.subs.length:1;let s=new Array(n).fill(null),i=0;for(let a of e)if(a.op===t){for(let c=0;c<a.subs.length;c++)s[i++]=a.subs[c];this.reuse(a)}else s[i++]=a;let o=this.newRegexp(t);if(o.subs=s,t===A.Op.ALTERNATE&&(o.subs=this.factor(o.subs),o.subs.length===1)){const a=o;o=o.subs[0],this.reuse(a)}return o}factor(e){if(e.length<2)return e;let t=0,n=e.length,s=0,i=null,o=0,a=0,c=0;for(let h=0;h<=n;h++){let d=null,C=0,I=0;if(h<n){let R=e[t+h];if(R.op===A.Op.CONCAT&&R.subs.length>0&&(R=R.subs[0]),R.op===A.Op.LITERAL&&(d=R.runes,C=R.runes.length,I=R.flags&k.FOLD_CASE),I===a){let N=0;for(;N<o&&N<C&&i[N]===d[N];)N++;if(N>0){o=N;continue}}}if(h!==c)if(h===c+1)e[s++]=e[t+c];else{const R=this.newRegexp(A.Op.LITERAL);R.flags=a,R.runes=i.slice(0,o);for(let K=c;K<h;K++)e[t+K]=this.removeLeadingString(e[t+K],o),this.checkLimits(e[t+K]);const N=this.collapse(e.slice(t+c,t+h),A.Op.ALTERNATE),M=this.newRegexp(A.Op.CONCAT);M.subs=[R,N],e[s++]=M}c=h,i=d,o=C,a=I}n=s,t=0,c=0,s=0;let B=null;for(let h=0;h<=n;h++){let d=null;if(!(h<n&&(d=W.leadingRegexp(e[t+h]),B!==null&&B.equals(d)&&(W.isCharClass(B)||B.op===A.Op.REPEAT&&B.min===B.max&&W.isCharClass(B.subs[0]))))){if(h!==c)if(h===c+1)e[s++]=e[t+c];else{const C=B;for(let N=c;N<h;N++){const M=N!==c;e[t+N]=this.removeLeadingRegexp(e[t+N],M),this.checkLimits(e[t+N])}const I=this.collapse(e.slice(t+c,t+h),A.Op.ALTERNATE),R=this.newRegexp(A.Op.CONCAT);R.subs=[C,I],e[s++]=R}c=h,B=d}}n=s,t=0,c=0,s=0;for(let h=0;h<=n;h++)if(!(h<n&&W.isCharClass(e[t+h]))){if(h!==c)if(h===c+1)e[s++]=e[t+c];else{let d=c;for(let I=c+1;I<h;I++){const R=e[t+d],N=e[t+I];(R.op<N.op||R.op===N.op&&(R.runes!==null?R.runes.length:0)<(N.runes!==null?N.runes.length:0))&&(d=I)}const C=e[t+c];e[t+c]=e[t+d],e[t+d]=C;for(let I=c+1;I<h;I++)W.mergeCharClass(e[t+c],e[t+I]),this.reuse(e[t+I]);this.cleanAlt(e[t+c]),e[s++]=e[t+c]}h<n&&(e[s++]=e[t+h]),c=h+1}n=s,t=0,c=0,s=0;for(let h=0;h<n;++h)h+1<n&&e[t+h].op===A.Op.EMPTY_MATCH&&e[t+h+1].op===A.Op.EMPTY_MATCH||(e[s++]=e[t+h]);return n=s,t=0,e.slice(t,n)}removeLeadingString(e,t){if(e.op===A.Op.CONCAT&&e.subs.length>0){const n=this.removeLeadingString(e.subs[0],t);if(e.subs[0]=n,n.op===A.Op.EMPTY_MATCH)switch(this.reuse(n),e.subs.length){case 0:case 1:e.op=A.Op.EMPTY_MATCH,e.subs=A.emptySubs();break;case 2:{const s=e;e=e.subs[1],this.reuse(s);break}default:e.subs=e.subs.slice(1,e.subs.length);break}return e}return e.op===A.Op.LITERAL&&(e.runes=e.runes.slice(t,e.runes.length),e.runes.length===0&&(e.op=A.Op.EMPTY_MATCH)),e}removeLeadingRegexp(e,t){if(e.op===A.Op.CONCAT&&e.subs.length>0){switch(t&&this.reuse(e.subs[0]),e.subs=e.subs.slice(1,e.subs.length),e.subs.length){case 0:e.op=A.Op.EMPTY_MATCH,e.subs=A.emptySubs();break;case 1:{const n=e;e=e.subs[0],this.reuse(n);break}}return e}return t&&this.reuse(e),this.newRegexp(A.Op.EMPTY_MATCH)}parseInternal(){if(this.flags&k.LITERAL)return W.literalRegexp(this.wholeRegexp,this.flags);let e=-1,t=-1,n=-1;const s=new ty(this.wholeRegexp);for(;s.more();){let i=-1;e:switch(s.peek()){case F.CODES.get("("):if(this.flags&k.LOOKBEHIND){if(s.lookingAt("(?<=")){this.parsePosLookBehind(),s.skip(4);break}if(s.lookingAt("(?<!")){this.parseNegLookBehind(),s.skip(4);break}}if(this.flags&k.PERL_X&&s.lookingAt("(?")){this.parsePerlFlags(s);break}this.op(A.Op.LEFT_PAREN).cap=++this.numCap,s.skip(1);break;case F.CODES.get("|"):this.parseVerticalBar(),s.skip(1);break;case F.CODES.get(")"):this.parseRightParen(),s.skip(1);break;case F.CODES.get("^"):this.flags&k.ONE_LINE?this.op(A.Op.BEGIN_TEXT):this.op(A.Op.BEGIN_LINE),s.skip(1);break;case F.CODES.get("$"):this.flags&k.ONE_LINE?this.op(A.Op.END_TEXT).flags|=k.WAS_DOLLAR:this.op(A.Op.END_LINE),s.skip(1);break;case F.CODES.get("."):this.flags&k.DOT_NL?this.op(A.Op.ANY_CHAR):this.op(A.Op.ANY_CHAR_NOT_NL),s.skip(1);break;case F.CODES.get("["):this.parseClass(s);break;case F.CODES.get("*"):case F.CODES.get("+"):case F.CODES.get("?"):{i=s.pos();let o=null;switch(s.pop()){case F.CODES.get("*"):o=A.Op.STAR;break;case F.CODES.get("+"):o=A.Op.PLUS;break;case F.CODES.get("?"):o=A.Op.QUEST;break}this.repeat(o,t,n,i,s,e);break}case F.CODES.get("{"):{i=s.pos();const o=W.parseRepeat(s);if(o<0){s.rewindTo(i),this.literal(s.pop());break}t=o>>16,n=(o&z.MAX_BMP)<<16>>16,this.repeat(A.Op.REPEAT,t,n,i,s,e);break}case F.CODES.get("\\"):{const o=s.pos();if(s.skip(1),this.flags&k.PERL_X&&s.more())switch(s.pop()){case F.CODES.get("A"):this.op(A.Op.BEGIN_TEXT);break e;case F.CODES.get("b"):this.op(A.Op.WORD_BOUNDARY);break e;case F.CODES.get("B"):this.op(A.Op.NO_WORD_BOUNDARY);break e;case F.CODES.get("C"):throw new De(W.ERR_INVALID_ESCAPE,"\\C");case F.CODES.get("Q"):{let B=s.rest();const h=B.indexOf("\\E");h>=0?(B=B.substring(0,h),s.skipString(B),s.skipString("\\E")):s.skipString(B);let d=0;for(;d<B.length;){const C=B.codePointAt(d);this.literal(C),d+=Y.charCount(C)}break e}case F.CODES.get("z"):this.op(A.Op.END_TEXT);break e;default:s.rewindTo(o);break}else s.rewindTo(o);const a=this.newRegexp(A.Op.CHAR_CLASS);if(a.flags=this.flags,s.lookingAt("\\p")||s.lookingAt("\\P")){const B=new Sn;if(this.parseUnicodeClass(s,B)){a.runes=B.toArray(),this.push(a);break e}}const c=new Sn;if(this.parsePerlClassEscape(s,c)){a.runes=c.toArray(),this.push(a);break e}s.rewindTo(o),this.reuse(a),this.literal(W.parseEscape(s));break}default:this.literal(s.pop());break}e=i}if(this.concat(),this.swapVerticalBar()&&this.pop(),this.alternate(),this.stack.length!==1)throw new De(W.ERR_MISSING_PAREN,this.wholeRegexp);return this.stack[0].namedGroups=this.namedGroups,this.stack[0]}parsePerlFlags(e){const t=e.pos(),n=e.rest();if(n.startsWith("(?P<")||n.startsWith("(?<")){const a=n.charAt(2)==="P"?4:3,c=n.indexOf(">");if(c<0)throw new De(W.ERR_INVALID_NAMED_CAPTURE,n);const B=n.substring(a,c);if(e.skipString(B),e.skip(a+1),!W.isValidCaptureName(B))throw new De(W.ERR_INVALID_NAMED_CAPTURE,n.substring(0,c+1));const h=this.op(A.Op.LEFT_PAREN);if(h.cap=++this.numCap,this.namedGroups[B])throw new De(W.ERR_DUPLICATE_NAMED_CAPTURE,B);this.namedGroups[B]=this.numCap,h.name=B;return}e.skip(2);let s=this.flags,i=1,o=!1;e:for(;e.more();){const a=e.pop();switch(a){case F.CODES.get("i"):s|=k.FOLD_CASE,o=!0;break;case F.CODES.get("m"):s&=-17,o=!0;break;case F.CODES.get("s"):s|=k.DOT_NL,o=!0;break;case F.CODES.get("U"):s|=k.NON_GREEDY,o=!0;break;case F.CODES.get("-"):if(i<0)break e;i=-1,s=~s,o=!1;break;case F.CODES.get(":"):case F.CODES.get(")"):if(i<0){if(!o)break e;s=~s}a===F.CODES.get(":")&&this.op(A.Op.LEFT_PAREN),this.flags=s;return;default:break e}}throw new De(W.ERR_INVALID_PERL_OP,e.from(t))}parsePosLookBehind(){const e=this.newRegexp(A.Op.LEFT_PAREN);return e.flags=this.flags,e.lb=++this.nlb,this.push(e)}parseNegLookBehind(){const e=this.newRegexp(A.Op.LEFT_PAREN);return e.flags=this.flags,e.lb=-++this.nlb,this.push(e)}parseVerticalBar(){this.concat(),this.swapVerticalBar()||this.op(A.Op.VERTICAL_BAR)}swapVerticalBar(){const e=this.stack.length;if(e>=3&&this.stack[e-2].op===A.Op.VERTICAL_BAR&&W.isCharClass(this.stack[e-1])&&W.isCharClass(this.stack[e-3])){let t=this.stack[e-1],n=this.stack[e-3];if(t.op>n.op){const s=n;n=t,t=s,this.stack[e-3]=n}return W.mergeCharClass(n,t),this.reuse(t),this.pop(),!0}if(e>=2){const t=this.stack[e-1],n=this.stack[e-2];if(n.op===A.Op.VERTICAL_BAR)return e>=3&&this.cleanAlt(this.stack[e-3]),this.stack[e-2]=t,this.stack[e-1]=n,!0}return!1}parseRightParen(){if(this.concat(),this.swapVerticalBar()&&this.pop(),this.alternate(),this.stack.length<2)throw new De(W.ERR_UNEXPECTED_PAREN,this.wholeRegexp);const e=this.pop(),t=this.pop();if(t.op!==A.Op.LEFT_PAREN)throw new De(W.ERR_UNEXPECTED_PAREN,this.wholeRegexp);if(this.flags=t.flags,t.lb!==0){if(W.hasCapture(e))throw new De(W.ERR_INVALID_CAPTURE_IN_LOOKBEHIND,this.wholeRegexp);t.lb>0?t.op=A.Op.PLB:t.op=A.Op.NLB,t.subs=[e],this.push(t);return}t.cap===0?this.push(e):(t.op=A.Op.CAPTURE,t.subs=[e],this.push(t))}parsePerlClassEscape(e,t){const n=e.pos();if(!(this.flags&k.PERL_X)||!e.more()||e.pop()!==F.CODES.get("\\")||!e.more())return!1;e.pop();const s=e.from(n),i=Hd.has(s)?Hd.get(s):null;return i===null?!1:(t.appendGroup(i,(this.flags&k.FOLD_CASE)!==0),!0)}parseNamedClass(e,t){const n=e.rest(),s=n.indexOf(":]");if(s<0)return!1;const i=n.substring(0,s+2);e.skipString(i);const o=rf.has(i)?rf.get(i):null;if(o===null)throw new De(W.ERR_INVALID_CHAR_RANGE,i);return t.appendGroup(o,(this.flags&k.FOLD_CASE)!==0),!0}parseUnicodeClass(e,t){const n=e.pos();if(!(this.flags&k.UNICODE_GROUPS)||!e.lookingAt("\\p")&&!e.lookingAt("\\P"))return!1;e.skip(1);let s=1,i=e.pop();if(i===F.CODES.get("P")&&(s=-1),!e.more())throw e.rewindTo(n),new De(W.ERR_INVALID_CHAR_RANGE,e.rest());i=e.pop();let o;if(i!==F.CODES.get("{"))o=Y.runeToString(i);else{const h=e.rest(),d=h.indexOf("}");if(d<0)throw e.rewindTo(n),new De(W.ERR_INVALID_CHAR_RANGE,e.rest());o=h.substring(0,d),e.skipString(o),e.skip(1)}o.length!==0&&o.codePointAt(0)===F.CODES.get("^")&&(s=0-s,o=o.substring(1));const a=W.unicodeTable(o);if(a===null)throw new De(W.ERR_INVALID_CHAR_RANGE,e.from(n));a.sign<0&&(s=0-s);const c=a.tab,B=a.fold;if(!(this.flags&k.FOLD_CASE)||B===null)t.appendTableWithSign(c,s);else{const h=new Sn().appendTable(c).appendTable(B).cleanClass().toArray();t.appendClassWithSign(h,s)}return!0}parseClass(e){const t=e.pos();e.skip(1);const n=this.newRegexp(A.Op.CHAR_CLASS);n.flags=this.flags;const s=new Sn;let i=1;e.more()&&e.lookingAt("^")&&(i=-1,e.skip(1),this.flags&k.CLASS_NL||s.appendRange(F.CODES.get(`
`),F.CODES.get(`
`)));let o=!0;for(;!e.more()||e.peek()!==F.CODES.get("]")||o;){if(e.more()&&e.lookingAt("-")&&!(this.flags&k.PERL_X)&&!o){const h=e.rest();if(h==="-"||!h.startsWith("-]"))throw e.rewindTo(t),new De(W.ERR_INVALID_CHAR_RANGE,e.rest())}o=!1;const a=e.pos();if(e.lookingAt("[:")){if(this.parseNamedClass(e,s))continue;e.rewindTo(a)}if(this.parseUnicodeClass(e,s)||this.parsePerlClassEscape(e,s))continue;e.rewindTo(a);const c=W.parseClassChar(e,t);let B=c;if(e.more()&&e.lookingAt("-")){if(e.skip(1),e.more()&&e.lookingAt("]"))e.skip(-1);else if(B=W.parseClassChar(e,t),B<c)throw new De(W.ERR_INVALID_CHAR_RANGE,e.from(a))}this.flags&k.FOLD_CASE?s.appendFoldedRange(c,B):s.appendRange(c,B)}e.skip(1),s.cleanClass(),i<0&&s.negateClass(),n.runes=s.toArray(),this.push(n)}},ry=class Ir{static initTest(e){const t=Ir.compile(e),n=new Ir(t.expr,t.prog,t.numSubexp,t.longest);return n.cond=t.cond,n.prefix=t.prefix,n.prefixUTF8=t.prefixUTF8,n.prefixComplete=t.prefixComplete,n.prefixRune=t.prefixRune,n.prefilter=t.prefilter,n}static compile(e){return Ir.compileImpl(e,k.PERL,!1)}static compilePOSIX(e){return Ir.compileImpl(e,k.POSIX,!0)}static compileImpl(e,t,n){let s=ny.parse(e,t);const i=s.maxCap();s=ey.simplify(s);const o=YI.build(s),a=ZI.compileRegexp(s),c=new Ir(e,a,i,n);c.prefilter=o.type===Ce.Type.NONE?null:o;const[B,h]=a.prefix();return c.prefixComplete=B,c.prefix=h,c.prefixUTF8=Y.stringToUtf8ByteArray(c.prefix),c.prefix.length>0&&(c.prefixRune=c.prefix.codePointAt(0)),c.namedGroups=s.namedGroups,c}static match(e,t){return Ir.compile(e).match(t)}constructor(e,t,n=0,s=0){this.expr=e,this.prog=t,this.numSubexp=n,this.longest=s,this.cond=t.startCond(),this.prefix=null,this.prefixUTF8=null,this.prefixComplete=!1,this.prefixRune=0,this.machinePool=[],this.dfa=new UI(this.prog),this.onepass=Vd.compile(this.prog),this.prefilter=null}matchPrefixComplete(e,t,n,s){if((n===k.ANCHOR_START||n===k.ANCHOR_BOTH)&&t!==0)return null;let i=-1,o=-1;const a=e.prefixLength(this);if(n===k.UNANCHORED){const c=e.index(this,t);if(c<0)return null;i=t+c,o=i+a}else if(n===k.ANCHOR_BOTH){if(e.endPos()!==a||e.index(this,0)!==0)return null;i=0,o=a}else if(n===k.ANCHOR_START){if(e.index(this,0)!==0)return null;i=0,o=a}if(i<0)return null;if(s>0){const c=new Int32Array(s).fill(-1);return c[0]=i,c[1]=o,Array.from(c)}return[]}executeEngine(e,t,n,s){if(this.prefixComplete&&(s===0||this.numSubexp===0))return this.matchPrefixComplete(e,t,n,s);if(this.prefilter!==null&&n===k.UNANCHORED&&!this.prefilter.eval(e,t))return null;if(this.onepass!==null)return Vd.execute(this,e,t,n,s);if(s>0)return this.prog.numLb===0&&e.endPos()<=sa.maxBitStateLen(this.prog)?sa.execute(this,e,t,n,s):this.doExecuteNFA(e,t,n,s);if(this.prog.numLb===0){const i=this.dfa.match(e,t,n);if(i!==null)return i?[]:null;if(e.endPos()<=sa.maxBitStateLen(this.prog))return sa.execute(this,e,t,n,s)}return this.doExecuteNFA(e,t,n,s)}numberOfCapturingGroups(){return this.numSubexp}numberOfInstructions(){return this.prog.numInst()}get(){return this.machinePool.length>0?this.machinePool.pop():null}reset(){this.machinePool.length=0}put(e){this.machinePool.push(e)}toString(){return this.expr}doExecuteNFA(e,t,n,s){let i=this.get();i||(i=kI.fromRE2(this)),i.init(s);const o=i.match(e,t,n)?i.submatches():null;return this.put(i),o}match(e){return this.executeEngine(we.fromUTF16(e),0,k.UNANCHORED,0)!==null}matchWithGroup(e,t,n,s,i){return e instanceof Ur||(Y.isByteArray(e)?e=Pr.utf8(e):e=Pr.utf16(e)),this.matchMachineInput(e,t,n,s,i)}matchMachineInput(e,t,n,s,i){if(t>n)return[!1,null];const o=e.isUTF16Encoding()?we.fromUTF16(e.asCharSequence(),0,n):we.fromUTF8(e.asBytes(),0,n),a=this.executeEngine(o,t,s,2*i);return a===null?[!1,null]:[!0,a]}matchUTF8(e){return this.executeEngine(we.fromUTF8(e),0,k.UNANCHORED,0)!==null}replaceAll(e,t){return this.replaceAllFunc(e,()=>t,2*e.length+1)}replaceFirst(e,t){return this.replaceAllFunc(e,()=>t,1)}replaceAllFunc(e,t,n){let s=0,i=0,o="";const a=we.fromUTF16(e);let c=0;for(;i<=e.length;){const B=this.executeEngine(a,i,k.UNANCHORED,2);if(B===null||B.length===0)break;o+=e.substring(s,B[0]),(B[1]>s||B[0]===0)&&(o+=t(e.substring(B[0],B[1])),c++),s=B[1];const h=a.step(i)&7;if(i+h>B[1]?i+=h:i+1>B[1]?i++:i=B[1],c>=n)break}return o+=e.substring(s),o}pad(e){if(e===null)return null;let t=(1+this.numSubexp)*2;if(e.length<t){let n=new Array(t).fill(-1);for(let s=0;s<e.length;s++)n[s]=e[s];e=n}return e}allMatches(e,t,n=s=>s){let s=[];const i=e.endPos();t<0&&(t=i+1);let o=0,a=0,c=-1;for(;a<t&&o<=i;){const B=this.executeEngine(e,o,k.UNANCHORED,this.prog.numCap);if(B===null||B.length===0)break;let h=!0;if(B[1]===o){B[0]===c&&(h=!1);const d=e.step(o);d<0?o=i+1:o+=d&7}else o=B[1];c=B[1],h&&(s.push(n(this.pad(B))),a++)}return s}findUTF8(e){const t=this.executeEngine(we.fromUTF8(e),0,k.UNANCHORED,2);return t===null?null:e.slice(t[0],t[1])}findUTF8Index(e){const t=this.executeEngine(we.fromUTF8(e),0,k.UNANCHORED,2);return t===null?null:t.slice(0,2)}find(e){const t=this.executeEngine(we.fromUTF16(e),0,k.UNANCHORED,2);return t===null?"":e.substring(t[0],t[1])}findIndex(e){return this.executeEngine(we.fromUTF16(e),0,k.UNANCHORED,2)}findUTF8Submatch(e){const t=this.executeEngine(we.fromUTF8(e),0,k.UNANCHORED,this.prog.numCap);if(t===null)return null;const n=new Array(1+this.numSubexp).fill(null);for(let s=0;s<n.length;s++)2*s<t.length&&t[2*s]>=0&&(n[s]=e.slice(t[2*s],t[2*s+1]));return n}findUTF8SubmatchIndex(e){return this.pad(this.executeEngine(we.fromUTF8(e),0,k.UNANCHORED,this.prog.numCap))}findSubmatch(e){const t=this.executeEngine(we.fromUTF16(e),0,k.UNANCHORED,this.prog.numCap);if(t===null)return null;const n=new Array(1+this.numSubexp).fill(null);for(let s=0;s<n.length;s++)2*s<t.length&&t[2*s]>=0&&(n[s]=e.substring(t[2*s],t[2*s+1]));return n}findSubmatchIndex(e){return this.pad(this.executeEngine(we.fromUTF16(e),0,k.UNANCHORED,this.prog.numCap))}findAllUTF8(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>e.slice(s[0],s[1]));return n.length===0?null:n}findAllUTF8Index(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>s.slice(0,2));return n.length===0?null:n}findAll(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>e.substring(s[0],s[1]));return n.length===0?null:n}findAllIndex(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>s.slice(0,2));return n.length===0?null:n}findAllUTF8Submatch(e,t){const n=this.allMatches(we.fromUTF8(e),t,s=>{let i=new Array(s.length/2|0).fill(null);for(let o=0;o<i.length;o++)s[2*o]>=0&&(i[o]=e.slice(s[2*o],s[2*o+1]));return i});return n.length===0?null:n}findAllUTF8SubmatchIndex(e,t){const n=this.allMatches(we.fromUTF8(e),t);return n.length===0?null:n}findAllSubmatch(e,t){const n=this.allMatches(we.fromUTF16(e),t,s=>{let i=new Array(s.length/2|0).fill(null);for(let o=0;o<i.length;o++)s[2*o]>=0&&(i[o]=e.substring(s[2*o],s[2*o+1]));return i});return n.length===0?null:n}findAllSubmatchIndex(e,t){const n=this.allMatches(we.fromUTF16(e),t);return n.length===0?null:n}},sy=class fs{static isHexadecimal(e){return"0"<=e&&e<="9"||"A"<=e&&e<="F"||"a"<=e&&e<="f"}static translate(e){let t="";if(e instanceof RegExp&&(e.ignoreCase&&(t+="i"),e.multiline&&(t+="m"),e.dotAll&&(t+="s"),e=e.source),typeof e!="string")return e;let n="",s=!1,i=e.length;i===0&&(n="(?:)",s=!0);let o=!1,a=0;for(;a<i;){let B=e[a];if(B==="\\"){if(a+1<i)switch(B=e[a+1],B){case"\\":n+="\\\\",a+=2;continue;case"c":if(a+2<i){let C=e[a+2].charCodeAt(0);if(C>=65&&C<=90||C>=97&&C<=122){let I=C%32;n+="\\x",n+=(I>>4).toString(16).toUpperCase(),n+=(I&15).toString(16).toUpperCase(),a+=3,s=!0;continue}}n+="c",a+=2,s=!0;continue;case"u":if(a+2<i){if(e[a+2]==="{"){let C=a+3,I=!1,R=!1;for(;C<i;){const N=e[C];if(N==="}"){R=!0;break}if(!fs.isHexadecimal(N))break;I=!0,C++}if(R&&I){n+="\\x",a+=2,s=!0;continue}}else if(a+5<i){let C=!0;for(let I=0;I<4;I++)if(!fs.isHexadecimal(e[a+2+I])){C=!1;break}if(C){n+="\\x{"+e.substring(a+2,a+6)+"}",a+=6,s=!0;continue}}}n+="u",a+=2,s=!0;continue;case"x":{let C=!1;if(a+2<i&&e[a+2]==="{"){let I=a+3,R=!1,N=!1;for(;I<i;){const M=e[I];if(M==="}"){N=!0;break}if(!fs.isHexadecimal(M))break;R=!0,I++}N&&R&&(C=!0)}else a+3<i&&fs.isHexadecimal(e[a+2])&&fs.isHexadecimal(e[a+3])&&(C=!0);C?(n+="\\x",a+=2):(n+="x",a+=2,s=!0);continue}case"n":case"r":case"t":case"a":case"f":case"v":case"d":case"D":case"s":case"S":case"w":case"W":case"b":case"B":case"p":case"P":case"A":case"z":case"Q":case"E":case"0":case"1":case"2":case"3":case"4":case"5":case"6":case"7":n+="\\"+B,a+=2;continue;default:{let C=e.codePointAt(a+1);if(C>=48&&C<=57||C>=65&&C<=90||C>=97&&C<=122){let I=Y.charCount(C);n+=e.substring(a+1,a+1+I),a+=I+1,s=!0}else{n+="\\";let I=Y.charCount(C);n+=e.substring(a+1,a+1+I),a+=I+1}continue}}}else if(B==="/"){n+="\\/",a+=1,s=!0;continue}else if(B==="[")o=!0;else if(B==="]")o=!1;else if(!o&&B==="("&&a+2<i&&e[a+1]==="?"&&e[a+2]==="<"&&a+3<i&&!"=!>)".includes(e[a+3])){n+="(?P<",a+=3,s=!0;continue}let h=e.codePointAt(a),d=Y.charCount(h);n+=e.substring(a,a+d),a+=d}const c=s?n:e;return t.length>0?`(?${t})${c}`:c}},HB=class Ht{static CASE_INSENSITIVE=is.CASE_INSENSITIVE;static DOTALL=is.DOTALL;static MULTILINE=is.MULTILINE;static DISABLE_UNICODE_GROUPS=is.DISABLE_UNICODE_GROUPS;static LONGEST_MATCH=is.LONGEST_MATCH;static LOOKBEHINDS=is.LOOKBEHINDS;static quote(e){return Y.quoteMeta(e)}static quoteReplacement(e,t=!1){return Nd.quoteReplacement(e,t)}static translateRegExp(e){return sy.translate(e)}static compile(e,t=0){let n=e;if(t&Ht.CASE_INSENSITIVE&&(n=`(?i)${n}`),t&Ht.DOTALL&&(n=`(?s)${n}`),t&Ht.MULTILINE&&(n=`(?m)${n}`),t&-544)throw new VI("Flags should only be a combination of MULTILINE, DOTALL, CASE_INSENSITIVE, DISABLE_UNICODE_GROUPS, LONGEST_MATCH, LOOKBEHINDS");let s=k.PERL;t&Ht.DISABLE_UNICODE_GROUPS&&(s&=-129),t&Ht.LOOKBEHINDS&&(s|=k.LOOKBEHIND);const i=new Ht(e,t);return i.re2Input=ry.compileImpl(n,s,(t&Ht.LONGEST_MATCH)!==0),i}static matches(e,t){return Ht.compile(e).testExact(t)}static initTest(e,t,n){if(e==null)throw new Error("pattern is null");if(n==null)throw new Error("re2 is null");const s=new Ht(e,t);return s.re2Input=n,s}constructor(e,t){this.patternInput=e,this.flagsInput=t,this.re2Input=null}reset(){this.re2Input.reset()}flags(){return this.flagsInput}pattern(){return this.patternInput}re2(){return this.re2Input}matches(e){return this.testExact(e)}matcher(e){return Y.isByteArray(e)&&(e=Pr.utf8(e)),new Nd(this,e)}test(e){return Y.isByteArray(e)?this.re2Input.matchUTF8(e):this.re2Input.match(e)}testExact(e){const t=Y.isByteArray(e)?we.fromUTF8(e):we.fromUTF16(e);return this.re2Input.executeEngine(t,0,k.ANCHOR_BOTH,0)!==null}exec(e){const t=this.matcher(e);if(!t.find())return null;const n=[t.group(0)];for(let i=1;i<=t.groupCount();i++){const o=t.group(i);n.push(o===null?void 0:o)}n.index=t.start(0),n.input=e;const s=this.namedGroups();if(Object.keys(s).length>0){const i=t.getNamedGroups();for(const o in i)i[o]===null&&(i[o]=void 0);n.groups=i}else n.groups=void 0;return n}split(e,t=0){const n=this.matcher(e),s=[];let i=0,o=0;for(;n.find();){if(o===0&&n.end()===0){o=n.end();continue}if(t>0&&s.length===t-1)break;if(o===n.start()){if(t===0){i+=1,o=n.end();continue}}else for(;i>0;)s.push(""),i-=1;s.push(n.substring(o,n.start())),o=n.end()}if(t===0&&o!==n.inputLength()){for(;i>0;)s.push(""),i-=1;s.push(n.substring(o,n.inputLength()))}return(t!==0||s.length===0&&!(o===n.inputLength()&&o>0))&&s.push(n.substring(o,n.inputLength())),s}*matchAll(e){const t=this.matcher(e);for(;t.find();){const n=[t.group(0)];for(let i=1;i<=t.groupCount();i++){const o=t.group(i);n.push(o===null?void 0:o)}n.index=t.start(0),n.input=e;const s=this.namedGroups();if(Object.keys(s).length>0){const i=t.getNamedGroups();for(const o in i)i[o]===null&&(i[o]=void 0);n.groups=i}else n.groups=void 0;yield n}}toString(){return this.patternInput}programSize(){return this.re2Input.numberOfInstructions()}groupCount(){return this.re2Input.numberOfCapturingGroups()}namedGroups(){return this.re2Input.namedGroups}equals(e){return this===e?!0:e===null||this.constructor!==e.constructor?!1:this.flagsInput===e.flagsInput&&this.patternInput===e.patternInput}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let $s="12.18.0";function iy(r){$s=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xn=new hu("@firebase/firestore");function Cs(){return Xn.logLevel}function s0(r){Xn.setLogLevel(r)}function G(r,...e){if(Xn.logLevel<=Be.DEBUG){const t=e.map(jB);Xn.debug(`Firestore (${$s}): ${r}`,...t)}}function Se(r,...e){if(Xn.logLevel<=Be.ERROR){const t=e.map(jB);Xn.error(`Firestore (${$s}): ${r}`,...t)}}function Nt(r,...e){if(Xn.logLevel<=Be.WARN){const t=e.map(jB);Xn.warn(`Firestore (${$s}): ${r}`,...t)}}function jB(r){if(typeof r=="string")return r;try{return function(t){return JSON.stringify(t)}(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,bp(r,n,t)}function bp(r,e,t){let n=`FIRESTORE (${$s}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Se(n),new Error(n)}function H(r,e,t,n){let s="Unexpected state";typeof t=="string"?s=t:n=t,r||bp(e,s,n)}function Q(r,e){return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oy(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qB{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const s=oy(40);for(let i=0;i<s.length;++i)n.length<20&&s[i]<t&&(n+=e.charAt(s[i]%62))}return n}}function se(r,e){return r<e?-1:r>e?1:0}function eB(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const s=r.charAt(n),i=e.charAt(n);if(s!==i)return vc(s)===vc(i)?se(s,i):vc(s)?1:-1}return se(r.length,e.length)}const ay=55296,uy=57343;function vc(r){const e=r.charCodeAt(0);return e>=ay&&e<=uy}function As(r,e,t){return r.length===e.length&&r.every((n,s)=>t(n,e[s]))}function Pp(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _e{constructor(e,t){this.comparator=e,this.root=t||Ke.EMPTY}insert(e,t){return new _e(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Ke.BLACK,null,null))}remove(e){return new _e(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Ke.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const s=this.comparator(e,n.key);if(s===0)return t+n.left.size;s<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new oa(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new oa(this.root,e,this.comparator,!1)}getReverseIterator(){return new oa(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new oa(this.root,e,this.comparator,!0)}}class oa{constructor(e,t,n,s){this.isReverse=s,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?n(e.key,t):1,t&&s&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Ke{constructor(e,t,n,s,i){this.key=e,this.value=t,this.color=n??Ke.RED,this.left=s??Ke.EMPTY,this.right=i??Ke.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,s,i){return new Ke(e??this.key,t??this.value,n??this.color,s??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let s=this;const i=n(e,s.key);return s=i<0?s.copy(null,null,null,s.left.insert(e,t,n),null):i===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,n)),s.fixUp()}removeMin(){if(this.left.isEmpty())return Ke.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return Ke.EMPTY;n=s.right.min(),s=s.copy(n.key,n.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Ke.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Ke.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw $(43730,{key:this.key,value:this.value});if(this.right.isRed())throw $(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw $(27949);return e+(this.isRed()?0:1)}}Ke.EMPTY=null,Ke.RED=!0,Ke.BLACK=!1;Ke.EMPTY=new class{constructor(){this.size=0}get key(){throw $(57766)}get value(){throw $(16141)}get color(){throw $(16727)}get left(){throw $(29726)}get right(){throw $(36894)}copy(e,t,n,s,i){return this}insert(e,t,n){return new Ke(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pe{constructor(e){this.comparator=e,this.data=new _e(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const s=n.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new sf(this.data.getIterator())}getIteratorFrom(e){return new sf(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof pe)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(this.comparator(s,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new pe(this.comparator);return t.data=e,t}}class sf{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function os(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const x={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class U extends Mt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jt="__name__";class jt{constructor(e,t,n){t===void 0?t=0:t>e.length&&$(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&$(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return jt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof jt?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let s=0;s<n;s++){const i=jt.compareSegments(e.get(s),t.get(s));if(i!==0)return i}return se(e.length,t.length)}static compareSegments(e,t){const n=jt.isNumericId(e),s=jt.isNumericId(t);return n&&!s?-1:!n&&s?1:n&&s?jt.extractNumericId(e).compare(jt.extractNumericId(t)):eB(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return zn.fromString(e.substring(4,e.length-2))}}class ue extends jt{construct(e,t,n){return new ue(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toStringWithLeadingSlash(){return`/${this.canonicalString()}`}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new U(x.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(s=>s.length>0))}return new ue(t)}static emptyPath(){return new ue([])}}const cy=/^[_a-zA-Z][_a-zA-Z0-9]*$/;let ke=class ps extends jt{construct(e,t,n){return new ps(e,t,n)}static isValidIdentifier(e){return cy.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ps.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Jt}static keyField(){return new ps([Jt])}static fromServerFormat(e){const t=[];let n="",s=0;const i=()=>{if(n.length===0)throw new U(x.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;s<e.length;){const a=e[s];if(a==="\\"){if(s+1===e.length)throw new U(x.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const c=e[s+1];if(c!=="\\"&&c!=="."&&c!=="`")throw new U(x.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=c,s+=2}else a==="`"?(o=!o,s++):a!=="."||o?(n+=a,s++):(i(),s++)}if(i(),o)throw new U(x.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new ps(t)}static emptyPath(){return new ps([])}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bt{constructor(e){this.fields=e,e.sort(ke.comparator)}static empty(){return new Bt([])}unionWith(e){let t=new pe(ke.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Bt(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return As(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Na(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function lr(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function By(r,e){const t=[];for(const n in r)Object.prototype.hasOwnProperty.call(r,n)&&t.push(e(r[n],n,r));return t}function Sp(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{constructor(e){this.path=e}static fromPath(e){return new q(ue.fromString(e))}static fromName(e){return new q(ue.fromString(e).popFirst(5))}static empty(){return new q(ue.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ue.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ue.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new q(new ue(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Op(r,e,t){if(!t)throw new U(x.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function ly(r,e,t,n){if(e===!0&&n===!0)throw new U(x.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function of(r){if(!q.isDocumentKey(r))throw new U(x.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function af(r){if(q.isDocumentKey(r))throw new U(x.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function yo(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function du(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":$(12329,{type:typeof r})}function It(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new U(x.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=du(r);throw new U(x.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ne(r,e){const t={typeString:r};return e&&(t.value=e),t}function wo(r,e){if(!yo(r))throw new U(x.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const s=e[n].typeString,i="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(s&&typeof o!==s){t=`JSON field '${n}' must be a ${s}.`;break}if(i!==void 0&&o!==i.value){t=`Expected '${n}' field to equal '${i.value}'`;break}}if(t)throw new U(x.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uf=-62135596800,cf=1e6;class ge{static now(){return ge.fromMillis(Date.now())}static fromDate(e){return ge.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*cf);return new ge(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new U(x.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new U(x.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<uf)throw new U(x.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new U(x.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/cf}_compareTo(e){return this.seconds===e.seconds?se(this.nanoseconds,e.nanoseconds):se(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ge._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(wo(e,ge._jsonSchema))return new ge(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-uf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ge._jsonSchemaVersion="firestore/timestamp/1.0",ge._jsonSchema={type:Ne("string",ge._jsonSchemaVersion),seconds:Ne("number"),nanoseconds:Ne("number")};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Np extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(s){try{return atob(s)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new Np("Invalid base64 string: "+i):i}}(e);return new Ae(t)}static fromUint8Array(e){const t=function(s){let i="";for(let o=0;o<s.length;++o)i+=String.fromCharCode(s[o]);return i}(e);return new Ae(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return se(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ae.EMPTY_BYTE_STRING=new Ae("");const hy=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function pn(r){if(H(!!r,39018),typeof r=="string"){let e=0;const t=hy.exec(r);if(H(!!t,46558,{timestamp:r}),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:Ie(r.seconds),nanos:Ie(r.nanos)}}function Ie(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function gn(r){return typeof r=="string"?Ae.fromBase64String(r):Ae.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fp="server_timestamp",Lp="__type__",xp="__previous_value__",Vp="__local_write_time__";function fu(r){return(r?.mapValue?.fields||{})[Lp]?.stringValue===Fp}function To(r){const e=r.mapValue.fields[xp];return fu(e)?To(e):e}function vs(r){const e=pn(r.mapValue.fields[Vp].timestampValue);return new ge(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dy{constructor(e,t,n,s,i,o,a,c,B,h,d,C,I){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=s,this.ssl=i,this.forceLongPolling=o,this.autoDetectLongPolling=a,this.longPollingOptions=c,this.useFetchStreams=B,this.isUsingEmulator=h,this.apiKey=d,this._customHeaders=C,this.grpcFlowControlWindow=I}}const Yi="(default)";class Hr{constructor(e,t){this.projectId=e,this.database=t||Yi}static empty(){return new Hr("","")}get isDefaultDatabase(){return this.database===Yi}isEqual(e){return e instanceof Hr&&e.projectId===this.projectId&&e.database===this.database}}function fy(r,e){if(!Object.prototype.hasOwnProperty.apply(r.options,["projectId"]))throw new U(x.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Hr(r.options.projectId,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fr=-1;function Cu(r){return r==null}function Rs(r){return r===0&&1/r==-1/0}function kp(r){return typeof r=="number"&&Number.isInteger(r)&&!Rs(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}function Cy(r){return typeof r=="string"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const JB="__type__",Mp="__max__",Jn={mapValue:{fields:{__type__:{stringValue:Mp}}}},KB="__vector__",jr="value",Wt={nullValue:"NULL_VALUE"},dt={booleanValue:!0},Je={booleanValue:!1};function Fe(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?fu(r)?4:Gp(r)?9007199254740991:qr(r)?10:11:$(28295,{value:r})}function Ft(r,e,t){if(r===e)return!0;const n=Fe(r);if(n!==Fe(e))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return vs(r).isEqual(vs(e));case 3:return function(i,o){if(typeof i.timestampValue=="string"&&typeof o.timestampValue=="string"&&i.timestampValue.length===o.timestampValue.length)return i.timestampValue===o.timestampValue;const a=pn(i.timestampValue),c=pn(o.timestampValue);return a.seconds===c.seconds&&a.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,o){return gn(i.bytesValue).isEqual(gn(o.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,o){return Ie(i.geoPointValue.latitude)===Ie(o.geoPointValue.latitude)&&Ie(i.geoPointValue.longitude)===Ie(o.geoPointValue.longitude)}(r,e);case 2:return function(i,o,a){if("integerValue"in i&&"integerValue"in o)return Ie(i.integerValue)===Ie(o.integerValue);let c,B;if("doubleValue"in i&&"doubleValue"in o)c=Ie(i.doubleValue),B=Ie(o.doubleValue);else{if(!a?.t)return!1;c=Ie(i.integerValue??i.doubleValue),B=Ie(o.integerValue??o.doubleValue)}return c===B?!!a?.i||Rs(c)===Rs(B):!!(a===void 0||a.o)&&isNaN(c)&&isNaN(B)}(r,e,t);case 9:return As(r.arrayValue.values||[],e.arrayValue.values||[],(s,i)=>Ft(s,i,t));case 10:case 11:return function(i,o,a){const c=i.mapValue.fields||{},B=o.mapValue.fields||{};if(Na(c)!==Na(B))return!1;for(const h in c)if(c.hasOwnProperty(h)&&(B[h]===void 0||!Ft(c[h],B[h],a)))return!1;return!0}(r,e,t);default:return $(52216,{left:r})}}function Xi(r,e){return(r.values||[]).find(t=>Ft(t,e))!==void 0}function tt(r,e){if(r===e)return 0;const t=Fe(r),n=Fe(e);if(t!==n)return se(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return se(r.booleanValue,e.booleanValue);case 2:return function(i,o){const a=Ie(i.integerValue||i.doubleValue),c=Ie(o.integerValue||o.doubleValue);return a<c?-1:a>c?1:a===c?0:isNaN(a)?isNaN(c)?0:-1:1}(r,e);case 3:return Bf(r.timestampValue,e.timestampValue);case 4:return Bf(vs(r),vs(e));case 5:return eB(r.stringValue,e.stringValue);case 6:return function(i,o){const a=gn(i),c=gn(o);return a.compareTo(c)}(r.bytesValue,e.bytesValue);case 7:return function(i,o){const a=i.split("/"),c=o.split("/");for(let B=0;B<a.length&&B<c.length;B++){const h=se(a[B],c[B]);if(h!==0)return h}return se(a.length,c.length)}(r.referenceValue,e.referenceValue);case 8:return function(i,o){const a=se(Ie(i.latitude),Ie(o.latitude));return a!==0?a:se(Ie(i.longitude),Ie(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return lf(r.arrayValue,e.arrayValue);case 10:return function(i,o){const a=i.fields||{},c=o.fields||{},B=a[jr]?.arrayValue,h=c[jr]?.arrayValue,d=se(B?.values?.length||0,h?.values?.length||0);return d!==0?d:lf(B,h)}(r.mapValue,e.mapValue);case 11:return function(i,o){if(i===Jn.mapValue&&o===Jn.mapValue)return 0;if(i===Jn.mapValue)return 1;if(o===Jn.mapValue)return-1;const a=i.fields||{},c=Object.keys(a),B=o.fields||{},h=Object.keys(B);c.sort(),h.sort();for(let d=0;d<c.length&&d<h.length;++d){const C=eB(c[d],h[d]);if(C!==0)return C;const I=tt(a[c[d]],B[h[d]]);if(I!==0)return I}return se(c.length,h.length)}(r.mapValue,e.mapValue);default:throw $(23264,{u:t})}}function Bf(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return se(r,e);const t=pn(r),n=pn(e),s=se(t.seconds,n.seconds);return s!==0?s:se(t.nanos,n.nanos)}function lf(r,e){const t=r.values||[],n=e.values||[];for(let s=0;s<t.length&&s<n.length;++s){const i=tt(t[s],n[s]);if(i!==void 0&&i!==0)return i}return se(t.length,n.length)}function bs(r){return tB(r)}function tB(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=pn(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return gn(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return q.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",s=!0;for(const i of t.values||[])s?s=!1:n+=",",n+=tB(i);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let s="{",i=!0;for(const o of n)i?i=!1:s+=",",s+=`${o}:${tB(t.fields[o])}`;return s+"}"}(r.mapValue):$(61005,{value:r})}function pa(r){switch(Fe(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=To(r);return e?16+pa(e):16;case 5:return 2*r.stringValue.length;case 6:return gn(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((s,i)=>s+pa(i),0)}(r.arrayValue);case 10:case 11:return function(n){let s=0;return lr(n.fields,(i,o)=>{s+=i.length+pa(o)}),s}(r.mapValue);default:throw $(13486,{value:r})}}function Zi(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function Kt(r){return!!r&&"integerValue"in r}function Sr(r){return!!r&&"doubleValue"in r}function Zn(r){return Kt(r)||Sr(r)}function er(r){return!!r&&"arrayValue"in r}function Dt(r){return!!r&&"nullValue"in r}function ft(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function Lr(r){return!!r&&"mapValue"in r}function qr(r){return(r?.mapValue?.fields||{})[JB]?.stringValue===KB}function nB(r){return(r?.mapValue?.fields||{})[jr]?.arrayValue}function xi(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return lr(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=xi(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=xi(r.arrayValue.values[t]);return e}return{...r}}function Gp(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Mp}const Up={mapValue:{fields:{[JB]:{stringValue:KB},[jr]:{arrayValue:{}}}}};function py(r){return"nullValue"in r?Wt:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?Zi(Hr.empty(),q.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?qr(r)?Up:{mapValue:{}}:$(35942,{value:r})}function gy(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?Zi(Hr.empty(),q.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?Up:"mapValue"in r?qr(r)?{mapValue:{}}:Jn:$(61959,{value:r})}function hf(r,e){const t=tt(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function df(r,e){const t=tt(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e){this.value=e}static empty(){return new ze({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!Lr(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=xi(t)}setAll(e){let t=ke.emptyPath(),n={},s=[];e.forEach((o,a)=>{if(!t.isImmediateParentOf(a)){const c=this.getFieldsMap(t);this.applyChanges(c,n,s),n={},s=[],t=a.popLast()}o?n[a.lastSegment()]=xi(o):s.push(a.lastSegment())});const i=this.getFieldsMap(t);this.applyChanges(i,n,s)}delete(e){const t=this.field(e.popLast());Lr(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Ft(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let s=t.mapValue.fields[e.get(n)];Lr(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,n){lr(t,(s,i)=>e[s]=i);for(const s of n)delete e[s]}clone(){return new ze(xi(this.value))}}function Hp(r){const e=[];return lr(r.fields,(t,n)=>{const s=new ke([t]);if(Lr(n)){const i=Hp(n.mapValue).fields;if(i.length===0)e.push(s);else for(const o of i)e.push(s.child(o))}else e.push(s)}),new Bt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pu(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Rs(e)?"-0":e}}function zB(r){return{integerValue:""+r}}function $B(r,e,t){return kp(e)?zB(e):pu(r,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gu{constructor(){this._=void 0}}function my(r,e,t){return r instanceof eo?function(s,i){const o={fields:{[Lp]:{stringValue:Fp},[Vp]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return i&&fu(i)&&(i=To(i)),i&&(o.fields[xp]=i),{mapValue:o}}(t,e):r instanceof Ps?qp(r,e):r instanceof Ss?Jp(r,e):r instanceof Os?function(s,i){const o=jp(s,i),a=Fa(o)+Fa(s.l);return Kt(o)&&Kt(s.l)?zB(a):pu(s.serializer,a)}(r,e):r instanceof to?function(s,i){return ff(s,i,Math.min)}(r,e):r instanceof no?function(s,i){return ff(s,i,Math.max)}(r,e):void 0}function Ey(r,e,t){return r instanceof Ps?qp(r,e):r instanceof Ss?Jp(r,e):t}function jp(r,e){return r instanceof Os?Zn(e)?e:{integerValue:0}:null}class eo extends gu{}class Ps extends gu{constructor(e){super(),this.elements=e}}function qp(r,e){const t=Kp(e);for(const n of r.elements)t.some(s=>Ft(s,n))||t.push(n);return{arrayValue:{values:t}}}class Ss extends gu{constructor(e){super(),this.elements=e}}function Jp(r,e){let t=Kp(e);for(const n of r.elements)t=t.filter(s=>!Ft(s,n));return{arrayValue:{values:t}}}class QB extends gu{constructor(e,t){super(),this.serializer=e,this.l=t}}class Os extends QB{}class to extends QB{}class no extends QB{}function ff(r,e,t){if(!Zn(e))return r.l;const n=t(Fa(e),Fa(r.l));return Kt(e)&&Kt(r.l)?zB(n):pu(r.serializer,n)}function Fa(r){return Ie(r.integerValue||r.doubleValue)}function Kp(r){return er(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _y{constructor(e,t){this.field=e,this.transform=t}}function Dy(r,e){return r.field.isEqual(e.field)&&function(n,s){return n instanceof Ps&&s instanceof Ps||n instanceof Ss&&s instanceof Ss?As(n.elements,s.elements,Ft):n instanceof Os&&s instanceof Os||n instanceof to&&s instanceof to||n instanceof no&&s instanceof no?Ft(n.l,s.l):n instanceof eo&&s instanceof eo}(r.transform,e.transform)}class Iy{constructor(e,t){this.version=e,this.transformResults=t}}class ot{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ot}static exists(e){return new ot(void 0,e)}static updateTime(e){return new ot(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function ga(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class mu{}function zp(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new Eu(r.key,ot.none()):new Qs(r.key,r.data,ot.none());{const t=r.data,n=ze.empty();let s=new pe(ke.comparator);for(let i of e.fields)if(!s.has(i)){let o=t.field(i);o===null&&i.length>1&&(i=i.popLast(),o=t.field(i)),o===null?n.delete(i):n.set(i,o),s=s.add(i)}return new Dn(r.key,n,new Bt(s.toArray()),ot.none())}}function yy(r,e,t){r instanceof Qs?function(s,i,o){const a=s.value.clone(),c=pf(s.fieldTransforms,i,o.transformResults);a.setAll(c),i.convertToFoundDocument(o.version,a).setHasCommittedMutations()}(r,e,t):r instanceof Dn?function(s,i,o){if(!ga(s.precondition,i))return void i.convertToUnknownDocument(o.version);const a=pf(s.fieldTransforms,i,o.transformResults),c=i.data;c.setAll($p(s)),c.setAll(a),i.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):function(s,i,o){i.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function Vi(r,e,t,n){return r instanceof Qs?function(i,o,a,c){if(!ga(i.precondition,o))return a;const B=i.value.clone(),h=gf(i.fieldTransforms,c,o);return B.setAll(h),o.convertToFoundDocument(o.version,B).setHasLocalMutations(),null}(r,e,t,n):r instanceof Dn?function(i,o,a,c){if(!ga(i.precondition,o))return a;const B=gf(i.fieldTransforms,c,o),h=o.data;return h.setAll($p(i)),h.setAll(B),o.convertToFoundDocument(o.version,h).setHasLocalMutations(),a===null?null:a.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map(d=>d.field))}(r,e,t,n):function(i,o,a){return ga(i.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):a}(r,e,t)}function wy(r,e){let t=null;for(const n of r.fieldTransforms){const s=e.data.field(n.field),i=jp(n.transform,s||null);i!=null&&(t===null&&(t=ze.empty()),t.set(n.field,i))}return t||null}function Cf(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,s){return n===void 0&&s===void 0||!(!n||!s)&&As(n,s,(i,o)=>Dy(i,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class Qs extends mu{constructor(e,t,n,s=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Dn extends mu{constructor(e,t,n,s,i=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=s,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function $p(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function pf(r,e,t){const n=new Map;H(r.length===t.length,32656,{h:t.length,T:r.length});for(let s=0;s<t.length;s++){const i=r[s],o=i.transform,a=e.data.field(i.field);n.set(i.field,Ey(o,a,t[s]))}return n}function gf(r,e,t){const n=new Map;for(const s of r){const i=s.transform,o=t.data.field(s.field);n.set(s.field,my(i,o,e))}return n}class Eu extends mu{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Qp extends mu{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ns{constructor(e,t){this.position=e,this.inclusive=t}}function mf(r,e,t){let n=0;for(let s=0;s<r.position.length;s++){const i=e[s],o=r.position[s];if(i.field.isKeyField()?n=q.comparator(q.fromName(o.referenceValue),t.key):n=tt(o,t.data.field(i.field)),i.dir==="desc"&&(n*=-1),n!==0)break}return n}function Ef(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!Ft(r.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wp{}class le extends Wp{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new Ty(e,t,n):t==="array-contains"?new Ry(e,n):t==="in"?new ng(e,n):t==="not-in"?new by(e,n):t==="array-contains-any"?new Py(e,n):new le(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new Ay(e,n):new vy(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(tt(t,this.value)):t!==null&&Fe(this.value)===Fe(t)&&this.matchesComparison(tt(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return $(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class me extends Wp{constructor(e,t){super(),this.filters=e,this.op=t,this.P=null}static create(e,t){return new me(e,t)}matches(e){return Fs(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.P!==null||(this.P=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.P}getFilters(){return Object.assign([],this.filters)}}function Fs(r){return r.op==="and"}function rB(r){return r.op==="or"}function WB(r){return Yp(r)&&Fs(r)}function Yp(r){for(const e of r.filters)if(e instanceof me)return!1;return!0}function sB(r){if(r instanceof le)return r.field.canonicalString()+r.op.toString()+bs(r.value);if(WB(r))return r.filters.map(e=>sB(e)).join(",");{const e=r.filters.map(t=>sB(t)).join(",");return`${r.op}(${e})`}}function Xp(r,e){return r instanceof le?function(n,s){return s instanceof le&&n.op===s.op&&n.field.isEqual(s.field)&&Ft(n.value,s.value)}(r,e):r instanceof me?function(n,s){return s instanceof me&&n.op===s.op&&n.filters.length===s.filters.length?n.filters.reduce((i,o,a)=>i&&Xp(o,s.filters[a]),!0):!1}(r,e):void $(19439)}function Zp(r,e){const t=r.filters.concat(e);return me.create(t,r.op)}function eg(r){return r instanceof le?function(t){return`${t.field.canonicalString()} ${t.op} ${bs(t.value)}`}(r):r instanceof me?function(t){return t.op.toString()+" {"+t.getFilters().map(eg).join(" ,")+"}"}(r):"Filter"}class Ty extends le{constructor(e,t,n){super(e,t,n),this.key=q.fromName(n.referenceValue)}matches(e){const t=q.comparator(e.key,this.key);return this.matchesComparison(t)}}class Ay extends le{constructor(e,t){super(e,"in",t),this.keys=tg("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class vy extends le{constructor(e,t){super(e,"not-in",t),this.keys=tg("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function tg(r,e){return(e.arrayValue?.values||[]).map(t=>q.fromName(t.referenceValue))}class Ry extends le{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return er(t)&&Xi(t.arrayValue,this.value)}}class ng extends le{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Xi(this.value.arrayValue,t)}}class by extends le{constructor(e,t){super(e,"not-in",t)}matches(e){if(Xi(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Xi(this.value.arrayValue,t)}}class Py extends le{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!er(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Xi(this.value.arrayValue,n))}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class La{constructor(e,t="asc"){this.field=e,this.dir=t}}function Sy(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X{static fromTimestamp(e){return new X(e)}static min(){return new X(new ge(0,0))}static max(){return new X(new ge(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class be{constructor(e,t,n,s,i,o,a){this.key=e,this.documentType=t,this.version=n,this.readTime=s,this.createTime=i,this.data=o,this.documentState=a}static newInvalidDocument(e){return new be(e,0,X.min(),X.min(),X.min(),ze.empty(),0)}static newFoundDocument(e,t,n,s){return new be(e,1,t,X.min(),n,s,0)}static newNoDocument(e,t){return new be(e,2,t,X.min(),X.min(),ze.empty(),0)}static newUnknownDocument(e,t){return new be(e,3,t,X.min(),X.min(),ze.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(X.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=ze.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=ze.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=X.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof be&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new be(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ls=-1;class xa{constructor(e,t,n,s){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=s}}function iB(r){return r.fields.find(e=>e.kind===2)}function yr(r){return r.fields.filter(e=>e.kind!==2)}xa.UNKNOWN_ID=-1;class ma{constructor(e,t){this.fieldPath=e,this.kind=t}}class ro{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new ro(0,Tt.min())}}function rg(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,s=X.fromTimestamp(n===1e9?new ge(t+1,0):new ge(t,n));return new Tt(s,q.empty(),e)}function sg(r){return new Tt(r.readTime,r.key,Ls)}class Tt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new Tt(X.min(),q.empty(),Ls)}static max(){return new Tt(X.max(),q.empty(),Ls)}}function YB(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=q.comparator(r.documentKey,e.documentKey),t!==0?t:se(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oy{constructor(e,t=null,n=[],s=[],i=null,o=null,a=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=s,this.limit=i,this.startAt=o,this.endAt=a,this.R=null}}function oB(r,e=null,t=[],n=[],s=null,i=null,o=null){return new Oy(r,e,t,n,s,i,o)}function Va(r){const e=Q(r);if(e.R===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>sB(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(i){return i.field.canonicalString()+i.dir}(n)).join(","),Cu(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>bs(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>bs(n)).join(",")),e.R=t}return e.R}function XB(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!Sy(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Xp(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!Ef(r.startAt,e.startAt)&&Ef(r.endAt,e.endAt)}function un(r){return!!r.isCorePipeline}function ZB(r){return!!r.path&&q.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function ka(r,e){return r.filters.filter(t=>t instanceof le&&t.field.isEqual(e))}function _f(r,e,t){let n=Wt,s=!0;for(const i of ka(r,e)){let o=Wt,a=!0;switch(i.op){case"<":case"<=":o=py(i.value);break;case"==":case"in":case">=":o=i.value;break;case">":o=i.value,a=!1;break;case"!=":case"not-in":o=Wt}hf({value:n,inclusive:s},{value:o,inclusive:a})<0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];hf({value:n,inclusive:s},{value:o,inclusive:t.inclusive})<0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}function Df(r,e,t){let n=Jn,s=!0;for(const i of ka(r,e)){let o=Jn,a=!0;switch(i.op){case">=":case">":o=gy(i.value),a=!1;break;case"==":case"in":case"<=":o=i.value;break;case"<":o=i.value,a=!1;break;case"!=":case"not-in":o=Jn}df({value:n,inclusive:s},{value:o,inclusive:a})>0&&(n=o,s=a)}if(t!==null){for(let i=0;i<r.orderBy.length;++i)if(r.orderBy[i].field.isEqual(e)){const o=t.position[i];df({value:n,inclusive:s},{value:o,inclusive:t.inclusive})>0&&(n=o,s=t.inclusive);break}}return{value:n,inclusive:s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ao{constructor(e,t=null,n=[],s=[],i=null,o="F",a=null,c=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=s,this.limit=i,this.limitType=o,this.startAt=a,this.endAt=c,this.I=null,this.A=null,this.V=null,this.startAt,this.endAt}}function ig(r,e,t,n,s,i,o,a){return new Ao(r,e,t,n,s,i,o,a)}function vo(r){return new Ao(r)}function If(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Ny(r){return q.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function og(r){return r.collectionGroup!==null}function ki(r){const e=Q(r);if(e.I===null){e.I=[];const t=new Set;for(const i of e.explicitOrderBy)e.I.push(i),t.add(i.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let a=new pe(ke.comparator);return o.filters.forEach(c=>{c.getFlattenedFilters().forEach(B=>{B.isInequality()&&(a=a.add(B.field))})}),a})(e).forEach(i=>{t.has(i.canonicalString())||i.isKeyField()||e.I.push(new La(i,n))}),t.has(ke.keyField().canonicalString())||e.I.push(new La(ke.keyField(),n))}return e.I}function yt(r){const e=Q(r);return e.A||(e.A=Fy(e,ki(r))),e.A}function Fy(r,e){if(r.limitType==="F")return oB(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(s=>{const i=s.dir==="desc"?"asc":"desc";return new La(s.field,i)});const t=r.endAt?new Ns(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Ns(r.startAt.position,r.startAt.inclusive):null;return oB(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function aB(r,e){const t=r.filters.concat([e]);return new Ao(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function uB(r,e,t){return new Ao(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function Ly(r,e){return XB(yt(r),yt(e))&&r.limitType===e.limitType}function Mi(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(s=>eg(s)).join(", ")}]`),Cu(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(s=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(s)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(s=>bs(s)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(s=>bs(s)).join(",")),`Target(${n})`}(yt(r))}; limitType=${r.limitType})`}function _u(r,e){return e.isFoundDocument()&&function(n,s){const i=s.key.path;return n.collectionGroup!==null?s.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(i):q.isDocumentKey(n.path)?n.path.isEqual(i):n.path.isImmediateParentOf(i)}(r,e)&&function(n,s){for(const i of ki(n))if(!i.field.isKeyField()&&s.data.field(i.field)===null)return!1;return!0}(r,e)&&function(n,s){for(const i of n.filters)if(!i.matches(s))return!1;return!0}(r,e)&&function(n,s){return!(n.startAt&&!function(o,a,c){const B=mf(o,a,c);return o.inclusive?B<=0:B<0}(n.startAt,ki(n),s)||n.endAt&&!function(o,a,c){const B=mf(o,a,c);return o.inclusive?B>=0:B>0}(n.endAt,ki(n),s))}(r,e)}function el(r){return(e,t)=>{let n=!1;for(const s of ki(r)){const i=xy(s,e,t);if(i!==0)return i;n=n||s.field.isKeyField()}return 0}}function xy(r,e,t){const n=r.field.isKeyField()?q.comparator(e.key,t.key):function(i,o,a){const c=o.data.field(i),B=a.data.field(i);return c!==null&&B!==null?tt(c,B):$(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return $(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vy{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Oe,he;function ky(r){switch(r){case x.OK:return $(64938);case x.CANCELLED:case x.UNKNOWN:case x.DEADLINE_EXCEEDED:case x.RESOURCE_EXHAUSTED:case x.INTERNAL:case x.UNAVAILABLE:case x.UNAUTHENTICATED:return!1;case x.INVALID_ARGUMENT:case x.NOT_FOUND:case x.ALREADY_EXISTS:case x.PERMISSION_DENIED:case x.FAILED_PRECONDITION:case x.ABORTED:case x.OUT_OF_RANGE:case x.UNIMPLEMENTED:case x.DATA_LOSS:return!0;default:return $(15467,{code:r})}}function ag(r){if(r===void 0)return Se("GRPC error has no .code"),x.UNKNOWN;switch(r){case Oe.OK:return x.OK;case Oe.CANCELLED:return x.CANCELLED;case Oe.UNKNOWN:return x.UNKNOWN;case Oe.DEADLINE_EXCEEDED:return x.DEADLINE_EXCEEDED;case Oe.RESOURCE_EXHAUSTED:return x.RESOURCE_EXHAUSTED;case Oe.INTERNAL:return x.INTERNAL;case Oe.UNAVAILABLE:return x.UNAVAILABLE;case Oe.UNAUTHENTICATED:return x.UNAUTHENTICATED;case Oe.INVALID_ARGUMENT:return x.INVALID_ARGUMENT;case Oe.NOT_FOUND:return x.NOT_FOUND;case Oe.ALREADY_EXISTS:return x.ALREADY_EXISTS;case Oe.PERMISSION_DENIED:return x.PERMISSION_DENIED;case Oe.FAILED_PRECONDITION:return x.FAILED_PRECONDITION;case Oe.ABORTED:return x.ABORTED;case Oe.OUT_OF_RANGE:return x.OUT_OF_RANGE;case Oe.UNIMPLEMENTED:return x.UNIMPLEMENTED;case Oe.DATA_LOSS:return x.DATA_LOSS;default:return $(39323,{code:r})}}(he=Oe||(Oe={}))[he.OK=0]="OK",he[he.CANCELLED=1]="CANCELLED",he[he.UNKNOWN=2]="UNKNOWN",he[he.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",he[he.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",he[he.NOT_FOUND=5]="NOT_FOUND",he[he.ALREADY_EXISTS=6]="ALREADY_EXISTS",he[he.PERMISSION_DENIED=7]="PERMISSION_DENIED",he[he.UNAUTHENTICATED=16]="UNAUTHENTICATED",he[he.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",he[he.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",he[he.ABORTED=10]="ABORTED",he[he.OUT_OF_RANGE=11]="OUT_OF_RANGE",he[he.UNIMPLEMENTED=12]="UNIMPLEMENTED",he[he.INTERNAL=13]="INTERNAL",he[he.UNAVAILABLE=14]="UNAVAILABLE",he[he.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class In{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[s,i]of n)if(this.equalsFn(s,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),s=this.inner[n];if(s===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let i=0;i<s.length;i++)if(this.equalsFn(s[i][0],e))return void(s[i]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let s=0;s<n.length;s++)if(this.equalsFn(n[s][0],e))return n.length===1?delete this.inner[t]:n.splice(s,1),this.innerSize--,!0;return!1}forEach(e){lr(this.inner,(t,n)=>{for(const[s,i]of n)e(s,i)})}isEmpty(){return Sp(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const My=new _e(q.comparator);function Ve(){return My}const ug=new _e(q.comparator);function Tr(...r){let e=ug;for(const t of r)e=e.insert(t.key,t);return e}function cg(r){let e=ug;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function Pt(){return Gi()}function Bg(){return Gi()}function Gi(){return new In(r=>r.toString(),(r,e)=>r.isEqual(e))}const Gy=new _e(q.comparator),Uy=new pe(q.comparator);function ie(...r){let e=Uy;for(const t of r)e=e.add(t);return e}const Hy=new pe(se);function tl(){return Hy}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jy(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qy=new zn([4294967295,4294967295],0);function yf(r){const e=jy().encode(r),t=new pp;return t.update(e),new Uint8Array(t.digest())}function wf(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),s=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new zn([t,n],0),new zn([s,i],0)]}class nl{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new Si(`Invalid padding: ${t}`);if(n<0)throw new Si(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new Si(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new Si(`Invalid padding when bitmap length is 0: ${t}`);this.m=8*e.length-t,this.p=zn.fromNumber(this.m)}S(e,t,n){let s=e.add(t.multiply(zn.fromNumber(n)));return s.compare(qy)===1&&(s=new zn([s.getBits(0),s.getBits(1)],0)),s.modulo(this.p).toNumber()}v(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.m===0)return!1;const t=yf(e),[n,s]=wf(t);for(let i=0;i<this.hashCount;i++){const o=this.S(n,s,i);if(!this.v(o))return!1}return!0}static create(e,t,n){const s=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),o=new nl(i,s,t);return n.forEach(a=>o.insert(a)),o}insert(e){if(this.m===0)return;const t=yf(e),[n,s]=wf(t);for(let i=0;i<this.hashCount;i++){const o=this.S(n,s,i);this.D(o)}}D(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class Si extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ws{constructor(e,t,n,s,i,o){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=s,this.augmentedDocumentUpdates=i,this.resolvedLimboDocuments=o}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const s=new Map;return s.set(e,Ro.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new Ws(X.min(),s,new _e(se),Ve(),Ve(),ie())}}class Ro{constructor(e,t,n,s,i){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=s,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new Ro(n,t,ie(),ie(),ie())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ea{constructor(e,t,n,s){this.C=e,this.removedTargetIds=t,this.key=n,this.F=s}}class lg{constructor(e,t){this.targetId=e,this.O=t}}class hg{constructor(e,t,n=Ae.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=s}}class Tf{constructor(e){this.targetId=e,this.M=0,this.N=Af(),this.L=Ae.EMPTY_BYTE_STRING,this.B=!1,this.U=!0}get current(){return this.B}get resumeToken(){return this.L}get k(){return this.M!==0}get q(){return this.U}$(e){e.approximateByteSize()>0&&(this.U=!0,this.L=e)}K(){let e=ie(),t=ie(),n=ie();return this.N.forEach((s,i)=>{switch(i){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:n=n.add(s);break;default:$(38017,{changeType:i})}}),new Ro(this.L,this.B,e,t,n)}W(){this.U=!1,this.N=Af()}G(e,t){this.U=!0,this.N=this.N.insert(e,t)}j(e){this.U=!0,this.N=this.N.remove(e)}H(){this.M+=1}J(){this.M-=1,H(this.M>=0,3241,{M:this.M,targetId:this.targetId})}Y(){this.U=!0,this.B=!0}}const _i="WatchChangeAggregator";class Jy{constructor(e){this.Z=e,this.X=new Map,this.ee=Ve(),this.te=aa(),this.ne=Ve(),this.re=aa(),this.ie=new _e(se)}se(e){for(const t of e.C)e.F&&e.F.isFoundDocument()?this._e(t,e.F):this.oe(t,e.key,e.F);for(const t of e.removedTargetIds)this.oe(t,e.key,e.F)}ae(e){this.forEachTarget(e,t=>{const n=this.X.get(t);if(n)switch(e.state){case 0:this.ue(t)&&n.$(e.resumeToken);break;case 1:n.J(),n.k||n.W(),n.$(e.resumeToken);break;case 2:n.J(),n.k||this.removeTarget(t);break;case 3:this.ue(t)&&(n.Y(),n.$(e.resumeToken));break;case 4:this.ue(t)&&(this.ce(t),n.$(e.resumeToken));break;default:$(56790,{state:e.state})}else G(_i,`handleTargetChange received targetChange for untracked target ID (${t}) with state (${e.state})`)})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.X.forEach((n,s)=>{this.ue(s)&&t(s)})}le(e){return un(e)?e.getPipelineSourceType()==="documents"&&e.getPipelineDocuments()?.length===1:ZB(e)}Ee(e){const t=e.targetId,n=e.O.count,s=this.he(t);if(s){const i=s.target;if(this.le(i))if(n===0){const o=new q(un(i)?ue.fromString(i.getPipelineDocuments()[0]):i.path);this.oe(t,o,be.newNoDocument(o,X.min()))}else H(n===1,20013,"Single document existence filter with count: "+n);else{const o=this.Te(t);if(o!==n){const a=this.Pe(e),c=a?this.Re(a,e,o):1;if(c!==0){this.ce(t);const B=c===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.ie=this.ie.insert(t,B)}}}}}Pe(e){const t=e.O.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:s=0},hashCount:i=0}=t;let o,a;try{o=gn(n).toUint8Array()}catch(c){if(c instanceof Np)return Nt("Decoding the base64 bloom filter in existence filter failed ("+c.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw c}try{a=new nl(o,s,i)}catch(c){return Nt(c instanceof Si?"BloomFilter error: ":"Applying bloom filter failed: ",c),null}return a.m===0?null:a}Re(e,t,n){return t.O.count===n-this.Ve(e,t.targetId)?0:2}Ve(e,t){const n=this.Z.getRemoteKeysForTarget(t);let s=0;return n.forEach(i=>{const o=this.Z.Ae(),a=`projects/${o.projectId}/databases/${o.database}/documents/${i.path.canonicalString()}`;e.mightContain(a)||(this.oe(t,i,null),s++)}),s}de(e){const t=new Map;this.X.forEach((i,o)=>{const a=this.he(o);if(a){if(i.current&&this.le(a.target)){const c=un(a.target)?ue.fromString(a.target.getPipelineDocuments()[0]):a.target.path,B=new q(c);this.fe(B).has(o)||this.me(o,B)||this.oe(o,B,be.newNoDocument(B,e))}i.q&&(t.set(o,i.K()),i.W())}});let n=ie();this.re.forEach((i,o)=>{let a=!0;o.forEachWhile(c=>{const B=this.he(c);return!B||B.purpose==="TargetPurposeLimboResolution"||(a=!1,!1)}),a&&(n=n.add(i))}),this.ee.forEach((i,o)=>o.setReadTime(e)),this.ne.forEach((i,o)=>o.setReadTime(e));const s=new Ws(e,t,this.ie,this.ee,this.ne,n);return this.ee=Ve(),this.te=aa(),this.ne=Ve(),this.re=aa(),this.ie=new _e(se),s}_e(e,t){const n=this.X.get(e);if(!n||!this.ue(e))return void G(_i,`addDocumentToTarget received document for unknown inactive target (${e})`);const s=this.me(e,t.key)?2:0;n.G(t.key,s),un(this.he(e).target)&&this.he(e).target.getPipelineFlavor()!=="exact"?this.ne=this.ne.insert(t.key,t):this.ee=this.ee.insert(t.key,t),this.te=this.te.insert(t.key,this.fe(t.key).add(e)),this.re=this.re.insert(t.key,this.pe(t.key).add(e))}oe(e,t,n){const s=this.X.get(e);s&&this.ue(e)?(this.me(e,t)?s.G(t,1):s.j(t),this.re=this.re.insert(t,this.pe(t).delete(e)),this.re=this.re.insert(t,this.pe(t).add(e)),n&&(un(this.he(e).target)&&this.he(e).target.getPipelineFlavor()!=="exact"?this.ne=this.ne.insert(t,n):this.ee=this.ee.insert(t,n))):G(_i,`removeDocumentFromTarget received document for unknown or inactive target (${e})`)}removeTarget(e){this.X.delete(e)}Te(e){const t=this.X.get(e);if(!t)return 0;const n=t.K();return this.Z.getRemoteKeysForTarget(e).size+n.addedDocuments.size-n.removedDocuments.size}H(e){let t=this.X.get(e);t||(G(_i,`recordPendingTargetRequest set up tracking for target ID ${e}`),t=new Tf(e),this.X.set(e,t)),t.H()}pe(e){let t=this.re.get(e);return t||(t=new pe(se),this.re=this.re.insert(e,t)),t}fe(e){let t=this.te.get(e);return t||(t=new pe(se),this.te=this.te.insert(e,t)),t}ue(e){const t=this.he(e)!==null;return t||G(_i,"Detected inactive target",e),t}he(e){const t=this.X.get(e);return t===void 0||t.k?null:this.Z.ge(e)}ce(e){this.X.set(e,new Tf(e)),this.Z.getRemoteKeysForTarget(e).forEach(t=>{this.oe(e,t,null)})}me(e,t){return this.Z.getRemoteKeysForTarget(e).has(t)}}function aa(){return new _e(q.comparator)}function Af(){return new _e(q.comparator)}const Ky={asc:"ASCENDING",desc:"DESCENDING"},zy={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},$y={and:"AND",or:"OR"};class Qy{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function cB(r,e){return r.useProto3Json||Cu(e)?e:{value:e}}function xs(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function rl(r){const e=pn(r);return new ge(e.seconds,e.nanos)}function dg(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function _a(r,e){return xs(r,e.toTimestamp())}function at(r){return H(!!r,49232),X.fromTimestamp(rl(r))}function sl(r,e){return BB(r,e).canonicalString()}function BB(r,e){const t=function(s){return new ue(["projects",s.projectId,"databases",s.database])}(r).child("documents");return e===void 0?t:t.child(e)}function fg(r){const e=ue.fromString(r);return H(wg(e),10190,{key:e.toString()}),e}function so(r,e){return sl(r.databaseId,e.path)}function xr(r,e){const t=fg(e);if(t.get(1)!==r.databaseId.projectId)throw new U(x.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new U(x.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new q(gg(t))}function Cg(r,e){return sl(r.databaseId,e)}function pg(r){const e=fg(r);return e.length===4?ue.emptyPath():gg(e)}function lB(r){return new ue(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function gg(r){return H(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function vf(r,e,t){return{name:so(r,e),fields:t.value.mapValue.fields}}function Wy(r,e,t){const n=xr(r,e.name),s=at(e.updateTime),i=e.createTime?at(e.createTime):X.min(),o=new ze({mapValue:{fields:e.fields}}),a=be.newFoundDocument(n,s,i,o);return t&&a.setHasCommittedMutations(),t?a.setHasCommittedMutations():a}function Yy(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(B){return B==="NO_CHANGE"?0:B==="ADD"?1:B==="REMOVE"?2:B==="CURRENT"?3:B==="RESET"?4:$(39313,{state:B})}(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],i=function(B,h){return B.useProto3Json?(H(h===void 0||typeof h=="string",58123),Ae.fromBase64String(h||"")):(H(h===void 0||h instanceof Buffer||h instanceof Uint8Array,16193),Ae.fromUint8Array(h||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,a=o&&function(B){const h=B.code===void 0?x.UNKNOWN:ag(B.code);return new U(h,B.message||"")}(o);t=new hg(n,s,i,a||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const s=xr(r,n.document.name),i=at(n.document.updateTime),o=n.document.createTime?at(n.document.createTime):X.min(),a=new ze({mapValue:{fields:n.document.fields}}),c=be.newFoundDocument(s,i,o,a),B=n.targetIds||[],h=n.removedTargetIds||[];t=new Ea(B,h,c.key,c)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const s=xr(r,n.document),i=n.readTime?at(n.readTime):X.min(),o=be.newNoDocument(s,i),a=n.removedTargetIds||[];t=new Ea([],a,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const s=xr(r,n.document),i=n.removedTargetIds||[];t=new Ea([],i,s,null)}else{if(!("filter"in e))return $(11601,{ye:e});{e.filter;const n=e.filter;n.targetId;const{count:s=0,unchangedNames:i}=n,o=new Vy(s,i),a=n.targetId;t=new lg(a,o)}}return t}function Ma(r,e){let t;if(e instanceof Qs)t={update:vf(r,e.key,e.value)};else if(e instanceof Eu)t={delete:so(r,e.key)};else if(e instanceof Dn)t={update:vf(r,e.key,e.data),updateMask:rw(e.fieldMask)};else{if(!(e instanceof Qp))return $(16599,{we:e.type});t={verify:so(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(i,o){const a=o.transform;if(a instanceof eo)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(a instanceof Ps)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:a.elements}};if(a instanceof Ss)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:a.elements}};if(a instanceof Os)return{fieldPath:o.field.canonicalString(),increment:a.l};if(a instanceof to)return{fieldPath:o.field.canonicalString(),minimum:a.l};if(a instanceof no)return{fieldPath:o.field.canonicalString(),maximum:a.l};throw $(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(s,i){return i.updateTime!==void 0?{updateTime:_a(s,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:$(27497)}(r,e.precondition)),t}function hB(r,e){const t=e.currentDocument?function(i){return i.updateTime!==void 0?ot.updateTime(at(i.updateTime)):i.exists!==void 0?ot.exists(i.exists):ot.none()}(e.currentDocument):ot.none(),n=e.updateTransforms?e.updateTransforms.map(s=>function(o,a){let c=null;if("setToServerValue"in a)H(a.setToServerValue==="REQUEST_TIME",16630,{proto:a}),c=new eo;else if("appendMissingElements"in a){const h=a.appendMissingElements.values||[];c=new Ps(h)}else if("removeAllFromArray"in a){const h=a.removeAllFromArray.values||[];c=new Ss(h)}else"increment"in a?c=new Os(o,a.increment):"minimum"in a?c=new to(o,a.minimum):"maximum"in a?c=new no(o,a.maximum):$(16584,{proto:a});const B=ke.fromServerFormat(a.fieldPath);return new _y(B,c)}(r,s)):[];if(e.update){e.update.name;const s=xr(r,e.update.name),i=new ze({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(c){const B=c.fieldPaths||[];return new Bt(B.map(h=>ke.fromServerFormat(h)))}(e.updateMask);return new Dn(s,i,o,t,n)}return new Qs(s,i,t,n)}if(e.delete){const s=xr(r,e.delete);return new Eu(s,t)}if(e.verify){const s=xr(r,e.verify);return new Qp(s,t)}return $(1463,{proto:e})}function Xy(r,e){return r&&r.length>0?(H(e!==void 0,14353),r.map(t=>function(s,i){let o=s.updateTime?at(s.updateTime):at(i);return o.isEqual(X.min())&&(o=at(i)),new Iy(o,s.transformResults||[])}(t,e))):[]}function mg(r,e){return{documents:[Cg(r,e.path)]}}function Eg(r,e){const t={structuredQuery:{}},n=e.path;let s;e.collectionGroup!==null?(s=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=Cg(r,s);const i=function(B){if(B.length!==0)return yg(me.create(B,"and"))}(e.filters);i&&(t.structuredQuery.where=i);const o=function(B){if(B.length!==0)return B.map(h=>function(C){return{field:gs(C.field),direction:ew(C.dir)}}(h))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const a=cB(r,e.limit);return a!==null&&(t.structuredQuery.limit=a),e.startAt&&(t.structuredQuery.startAt=function(B){return{before:B.inclusive,values:B.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(B){return{before:!B.inclusive,values:B.position}}(e.endAt)),{be:t,parent:s}}function _g(r){let e=pg(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let s=null;if(n>0){H(n===1,65062);const h=t.from[0];h.allDescendants?s=h.collectionId:e=e.child(h.collectionId)}let i=[];t.where&&(i=function(d){const C=Ig(d);return C instanceof me&&WB(C)?C.getFilters():[C]}(t.where));let o=[];t.orderBy&&(o=function(d){return d.map(C=>function(R){return new La(ms(R.field),function(M){switch(M){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(R.direction))}(C))}(t.orderBy));let a=null;t.limit&&(a=function(d){let C;return C=typeof d=="object"?d.value:d,Cu(C)?null:C}(t.limit));let c=null;t.startAt&&(c=function(d){const C=!!d.before,I=d.values||[];return new Ns(I,C)}(t.startAt));let B=null;return t.endAt&&(B=function(d){const C=!d.before,I=d.values||[];return new Ns(I,C)}(t.endAt)),ig(e,s,o,i,a,"F",c,B)}function Zy(r,e){const t=function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return $(28987,{purpose:s})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Dg(r,e){return{structuredPipeline:{pipeline:{stages:e.stages.map(t=>t._toProto(r))}}}}function Ig(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=ms(t.unaryFilter.field);return le.create(n,"==",{doubleValue:NaN});case"IS_NULL":const s=ms(t.unaryFilter.field);return le.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=ms(t.unaryFilter.field);return le.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=ms(t.unaryFilter.field);return le.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return $(61313);default:return $(60726)}}(r):r.fieldFilter!==void 0?function(t){return le.create(ms(t.fieldFilter.field),function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return $(58110);default:return $(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return me.create(t.compositeFilter.filters.map(n=>Ig(n)),function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return $(1026)}}(t.compositeFilter.op))}(r):$(30097,{filter:r})}function ew(r){return Ky[r]}function tw(r){return zy[r]}function nw(r){return $y[r]}function gs(r){return{fieldPath:r.canonicalString()}}function ms(r){return ke.fromServerFormat(r.fieldPath)}function yg(r){return r instanceof le?function(t){if(t.op==="=="){if(ft(t.value))return{unaryFilter:{field:gs(t.field),op:"IS_NAN"}};if(Dt(t.value))return{unaryFilter:{field:gs(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(ft(t.value))return{unaryFilter:{field:gs(t.field),op:"IS_NOT_NAN"}};if(Dt(t.value))return{unaryFilter:{field:gs(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:gs(t.field),op:tw(t.op),value:t.value}}}(r):r instanceof me?function(t){const n=t.getFilters().map(s=>yg(s));return n.length===1?n[0]:{compositeFilter:{op:nw(t.op),filters:n}}}(r):$(54877,{filter:r})}function rw(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function wg(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}function Tg(r){return!!r&&typeof r._toProto=="function"&&r._protoValueType==="ProtoValue"}function io(r,e){const t={fields:{}};return e.forEach((n,s)=>{if(typeof s!="string")throw new Error(`Cannot encode map with non-string key: ${s}`);t.fields[s]=n._toProto(r)}),{mapValue:t}}function Ag(r){return{stringValue:r}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Du(r){return new Qy(r,!0)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class St{constructor(e){this._byteString=e}static fromBase64String(e){try{return new St(Ae.fromBase64String(e))}catch(t){throw new U(x.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new St(Ae.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:St._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(wo(e,St._jsonSchema))return St.fromBase64String(e.bytes)}}St._jsonSchemaVersion="firestore/bytes/1.0",St._jsonSchema={type:Ne("string",St._jsonSchemaVersion),bytes:Ne("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Iu{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new U(x.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ke(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}function sw(){return new Iu(Jt)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class il{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new U(x.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new U(x.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return se(this._lat,e._lat)||se(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Yt._jsonSchemaVersion}}static fromJSON(e){if(wo(e,Yt._jsonSchema))return new Yt(e.latitude,e.longitude)}}Yt._jsonSchemaVersion="firestore/geoPoint/1.0",Yt._jsonSchema={type:Ne("string",Yt._jsonSchemaVersion),latitude:Ne("number"),longitude:Ne("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}qe.UNAUTHENTICATED=new qe(null),qe.GOOGLE_CREDENTIALS=new qe("google-credentials-uid"),qe.FIRST_PARTY=new qe("first-party-uid"),qe.MOCK_USER=new qe("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xt{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vg{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class iw{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(qe.UNAUTHENTICATED))}shutdown(){}}class ow{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class aw{constructor(e){this.ve=e,this.currentUser=qe.UNAUTHENTICATED,this.De=0,this.forceRefresh=!1,this.auth=null}start(e,t){H(this.xe===void 0,42304);let n=this.De;const s=c=>this.De!==n?(n=this.De,t(c)):Promise.resolve();let i=new Xt;this.xe=()=>{this.De++,this.currentUser=this.Ce(),i.resolve(),i=new Xt,e.enqueueRetryable(()=>s(this.currentUser))};const o=()=>{const c=i;e.enqueueRetryable(async()=>{await c.promise,await s(this.currentUser)})},a=c=>{G("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=c,this.xe&&(this.auth.addAuthTokenListener(this.xe),o())};this.ve.onInit(c=>a(c)),setTimeout(()=>{if(!this.auth){const c=this.ve.getImmediate({optional:!0});c?a(c):(G("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new Xt)}},0),o()}getToken(){const e=this.De,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.De!==e?(G("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(H(typeof n.accessToken=="string",31837,{Fe:n}),new vg(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.xe&&this.auth.removeAuthTokenListener(this.xe),this.xe=void 0}Ce(){const e=this.auth&&this.auth.getUid();return H(e===null||typeof e=="string",2055,{Oe:e}),new qe(e)}}class uw{constructor(e,t,n){this.Me=e,this.Ne=t,this.Le=n,this.type="FirstParty",this.user=qe.FIRST_PARTY,this.Be=new Map}Ue(){return this.Le?this.Le():null}get headers(){this.Be.set("X-Goog-AuthUser",this.Me);const e=this.Ue();return e&&this.Be.set("Authorization",e),this.Ne&&this.Be.set("X-Goog-Iam-Authorization-Token",this.Ne),this.Be}}class cw{constructor(e,t,n){this.Me=e,this.Ne=t,this.Le=n}getToken(){return Promise.resolve(new uw(this.Me,this.Ne,this.Le))}start(e,t){e.enqueueRetryable(()=>t(qe.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Rf{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Bw{constructor(e,t){this.ke=t,this.forceRefresh=!1,this.appCheck=null,this.qe=null,this.$e=null,_t(e)&&e.settings.appCheckToken&&(this.$e=e.settings.appCheckToken)}start(e,t){H(this.xe===void 0,3512);const n=i=>{i.error!=null&&G("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const o=i.token!==this.qe;return this.qe=i.token,G("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(i.token):Promise.resolve()};this.xe=i=>{e.enqueueRetryable(()=>n(i))};const s=i=>{G("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.xe&&this.appCheck.addTokenListener(this.xe)};this.ke.onInit(i=>s(i)),setTimeout(()=>{if(!this.appCheck){const i=this.ke.getImmediate({optional:!0});i?s(i):G("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.$e)return Promise.resolve(new Rf(this.$e));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(H(typeof t.token=="string",44558,{tokenResult:t}),this.qe=t.token,new Rf(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.xe&&this.appCheck.removeTokenListener(this.xe),this.xe=void 0}}function Rg(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lw{Ke(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bf="ConnectivityMonitor";class Pf{constructor(){this.Qe=()=>this.We(),this.Ge=()=>this.ze(),this.je=[],this.He()}Ke(e){this.je.push(e)}shutdown(){window.removeEventListener("online",this.Qe),window.removeEventListener("offline",this.Ge)}He(){window.addEventListener("online",this.Qe),window.addEventListener("offline",this.Ge)}We(){G(bf,"Network connectivity changed: AVAILABLE");for(const e of this.je)e(0)}ze(){G(bf,"Network connectivity changed: UNAVAILABLE");for(const e of this.je)e(1)}static Je(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ua=null;function dB(){return ua===null?ua=function(){return 268435456+Math.round(2147483648*Math.random())}():ua++,"0x"+ua.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rc="RestConnection",hw={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery",ExecutePipeline:"executePipeline"};class dw{get Ye(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Ze=t+"://"+e.host,this.Xe=`projects/${n}/databases/${s}`,this.et=this.databaseId.database===Yi?`project_id=${n}`:`project_id=${n}&database_id=${s}`}tt(e,t,n,s,i){const o=dB(),a=this.nt(e,t.toUriEncodedString());G(Rc,`Sending RPC '${e}' ${o}:`,a,n);const c={"google-cloud-resource-prefix":this.Xe,"x-goog-request-params":this.et};this.rt(c,s,i);const{host:B}=new URL(a),h=Ks(B);return this.it(e,a,c,n,h).then(d=>(G(Rc,`Received RPC '${e}' ${o}: `,d),d),d=>{throw Nt(Rc,`RPC '${e}' ${o} failed with error: `,d,"url: ",a,"request:",n),d})}st(e,t,n,s,i,o){return this.tt(e,t,n,s,i)}rt(e,t,n){if(e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+$s}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((s,i)=>e[i]=s),n&&n.headers.forEach((s,i)=>e[i]=s),this.databaseInfo._customHeaders)for(const s of Object.keys(this.databaseInfo._customHeaders))e[s]=this.databaseInfo._customHeaders[s]}nt(e,t){const n=hw[e];let s=`${this.Ze}/v1/${t}:${n}`;return this.databaseInfo.apiKey&&(s=`${s}?key=${encodeURIComponent(this.databaseInfo.apiKey)}`),s}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fw{constructor(e){this._t=e._t,this.ot=e.ot}ut(e){this.ct=e}lt(e){this.Et=e}ht(e){this.Tt=e}onMessage(e){this.Pt=e}close(){this.ot()}send(e){this._t(e)}Rt(){this.ct()}It(){this.Et()}At(e){this.Tt(e)}Vt(e){this.Pt(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ye="WebChannelConnection",Di=(r,e,t)=>{r.listen(e,n=>{try{t(n)}catch(s){setTimeout(()=>{throw s},0)}})};class Ds extends dw{constructor(e){super(e),this.dt=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}static ft(){if(!Ds.gt){const e=_p();Di(e,Ep.STAT_EVENT,t=>{t.stat===$c.PROXY?G(Ye,"STAT_EVENT: detected buffering proxy"):t.stat===$c.NOPROXY&&G(Ye,"STAT_EVENT: detected no buffering proxy")}),Ds.gt=!0}}it(e,t,n,s,i){const o=dB();return new Promise((a,c)=>{const B=new gp;B.setWithCredentials(!0),B.listenOnce(mp.COMPLETE,()=>{try{switch(B.getLastErrorCode()){case Ca.NO_ERROR:const d=B.getResponseJson();G(Ye,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(d)),a(d);break;case Ca.TIMEOUT:G(Ye,`RPC '${e}' ${o} timed out`),c(new U(x.DEADLINE_EXCEEDED,"Request time out"));break;case Ca.HTTP_ERROR:const C=B.getStatus();if(G(Ye,`RPC '${e}' ${o} failed with status:`,C,"response text:",B.getResponseText()),C>0){let I=B.getResponseJson();Array.isArray(I)&&(I=I[0]);const R=I?.error;if(R&&R.status&&R.message){const N=function(K){const Z=K.toLowerCase().replace(/_/g,"-");return Object.values(x).indexOf(Z)>=0?Z:x.UNKNOWN}(R.status);c(new U(N,R.message))}else c(new U(x.UNKNOWN,"Server responded with status "+B.getStatus()))}else c(new U(x.UNAVAILABLE,"Connection failed."));break;default:$(9055,{yt:e,streamId:o,wt:B.getLastErrorCode(),bt:B.getLastError()})}}finally{G(Ye,`RPC '${e}' ${o} completed.`)}});const h=JSON.stringify(s);G(Ye,`RPC '${e}' ${o} sending request:`,s),B.send(t,"POST",h,n,15)})}St(e,t,n){const s=dB(),i=[this.Ze,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=this.createWebChannelTransport(),a={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},c=this.longPollingOptions.timeoutSeconds;c!==void 0&&(a.longPollingTimeout=Math.round(1e3*c)),this.useFetchStreams&&(a.useFetchStreams=!0),this.rt(a.initMessageHeaders,t,n),a.encodeInitMessageHeaders=!0;const B=i.join("");G(Ye,`Creating RPC '${e}' stream ${s}: ${B}`,a);const h=o.createWebChannel(B,a);this.vt(h);let d=!1,C=!1;const I=new fw({_t:R=>{C?G(Ye,`Not sending because RPC '${e}' stream ${s} is closed:`,R):(d||(G(Ye,`Opening RPC '${e}' stream ${s} transport.`),h.open(),d=!0),G(Ye,`RPC '${e}' stream ${s} sending:`,R),h.send(R))},ot:()=>h.close()});return Di(h,bi.EventType.OPEN,()=>{C||(G(Ye,`RPC '${e}' stream ${s} transport opened.`),I.Rt())}),Di(h,bi.EventType.CLOSE,()=>{C||(C=!0,G(Ye,`RPC '${e}' stream ${s} transport closed`),I.At(),this.Dt(h))}),Di(h,bi.EventType.ERROR,R=>{C||(C=!0,Nt(Ye,`RPC '${e}' stream ${s} transport errored. Name:`,R.name,"Message:",R.message),I.At(new U(x.UNAVAILABLE,"The operation could not be completed")))}),Di(h,bi.EventType.MESSAGE,R=>{if(!C){const N=R.data[0];H(!!N,16349);const M=N,K=M?.error||M[0]?.error;if(K){G(Ye,`RPC '${e}' stream ${s} received error:`,K);const Z=K.status;let te=function(oe){const y=Oe[oe];if(y!==void 0)return ag(y)}(Z),ce=K.message;Z==="NOT_FOUND"&&ce.includes("database")&&ce.includes("does not exist")&&ce.includes(this.databaseId.database)&&Nt(`Database '${this.databaseId.database}' not found. Please check your project configuration.`),te===void 0&&(te=x.INTERNAL,ce="Unknown error status: "+Z+" with message "+K.message),C=!0,I.At(new U(te,ce)),h.close()}else G(Ye,`RPC '${e}' stream ${s} received:`,N),I.Vt(N)}}),Ds.ft(),setTimeout(()=>{I.It()},0),I}terminate(){this.dt.forEach(e=>e.close()),this.dt=[]}vt(e){this.dt.push(e)}Dt(e){this.dt=this.dt.filter(t=>t===e)}rt(e,t,n){super.rt(e,t,n),this.databaseInfo.apiKey&&(e["x-goog-api-key"]=this.databaseInfo.apiKey)}createWebChannelTransport(){return Dp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cw(r){return new Ds(r)}Ds.gt=!1;class bg{constructor(e,t,n=1e3,s=1.5,i=6e4){this.xt=e,this.timerId=t,this.Ct=n,this.Ft=s,this.Ot=i,this.Mt=0,this.Nt=null,this.Lt=Date.now(),this.reset()}reset(){this.Mt=0}Bt(){this.Mt=this.Ot}Ut(e){this.cancel();const t=Math.floor(this.Mt+this.kt()),n=Math.max(0,Date.now()-this.Lt),s=Math.max(0,t-n);s>0&&G("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.Mt} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.Nt=this.xt.enqueueAfterDelay(this.timerId,s,()=>(this.Lt=Date.now(),e())),this.Mt*=this.Ft,this.Mt<this.Ct&&(this.Mt=this.Ct),this.Mt>this.Ot&&(this.Mt=this.Ot)}qt(){this.Nt!==null&&(this.Nt.skipDelay(),this.Nt=null)}cancel(){this.Nt!==null&&(this.Nt.cancel(),this.Nt=null)}kt(){return(Math.random()-.5)*this.Mt}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sf="PersistentStream";class Pg{constructor(e,t,n,s,i,o,a,c){this.xt=e,this.$t=n,this.Kt=s,this.connection=i,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=a,this.listener=c,this.state=0,this.Qt=0,this.Wt=null,this.Gt=null,this.stream=null,this.zt=0,this.jt=new bg(e,t)}Ht(){return this.state===1||this.state===5||this.Jt()}Jt(){return this.state===2||this.state===3}start(){this.zt=0,this.state!==4?this.auth():this.Yt()}async stop(){this.Ht()&&await this.close(0)}Zt(){this.state=0,this.jt.reset()}Xt(){this.Jt()&&this.Wt===null&&(this.Wt=this.xt.enqueueAfterDelay(this.$t,6e4,()=>this.en()))}tn(e){this.nn(),this.stream.send(e)}async en(){if(this.Jt())return this.close(0)}nn(){this.Wt&&(this.Wt.cancel(),this.Wt=null)}rn(){this.Gt&&(this.Gt.cancel(),this.Gt=null)}async close(e,t){this.nn(),this.rn(),this.jt.cancel(),this.Qt++,e!==4?this.jt.reset():t&&t.code===x.RESOURCE_EXHAUSTED?(Se(t.toString()),Se("Using maximum backoff delay to prevent overloading the backend."),this.jt.Bt()):t&&t.code===x.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.sn(),this.stream.close(),this.stream=null),this.state=e,await this.listener.ht(t)}sn(){}auth(){this.state=1;const e=this._n(this.Qt),t=this.Qt;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,s])=>{this.Qt===t&&this.an(n,s)},n=>{e(()=>{const s=new U(x.UNKNOWN,"Fetching auth token failed: "+n.message);return this.un(s)})})}an(e,t){const n=this._n(this.Qt);this.stream=this.cn(e,t),this.stream.ut(()=>{n(()=>this.listener.ut())}),this.stream.lt(()=>{n(()=>(this.state=2,this.Gt=this.xt.enqueueAfterDelay(this.Kt,1e4,()=>(this.Jt()&&(this.state=3),Promise.resolve())),this.listener.lt()))}),this.stream.ht(s=>{n(()=>this.un(s))}),this.stream.onMessage(s=>{n(()=>++this.zt==1?this.En(s):this.onNext(s))})}Yt(){this.state=5,this.jt.Ut(async()=>{this.state=0,this.start()})}un(e){return G(Sf,`close with error: ${e}`),this.stream=null,this.close(4,e)}_n(e){return t=>{this.xt.enqueueAndForget(()=>this.Qt===e?t():(G(Sf,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class pw extends Pg{constructor(e,t,n,s,i,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}cn(e,t){return this.connection.St("Listen",e,t)}En(e){return this.onNext(e)}onNext(e){this.jt.reset();const t=Yy(this.serializer,e),n=function(i){if(!("targetChange"in i))return X.min();const o=i.targetChange;return o.targetIds&&o.targetIds.length?X.min():o.readTime?at(o.readTime):X.min()}(e);return this.listener.hn(t,n)}Tn(e){const t={};t.database=lB(this.serializer),t.addTarget=function(i,o){let a;const c=o.target;if(a=un(c)?{pipelineQuery:Dg(i,c)}:ZB(c)?{documents:mg(i,c)}:{query:Eg(i,c).be},a.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){a.resumeToken=dg(i,o.resumeToken);const B=cB(i,o.expectedCount);B!==null&&(a.expectedCount=B)}else if(o.snapshotVersion.compareTo(X.min())>0){a.readTime=xs(i,o.snapshotVersion.toTimestamp());const B=cB(i,o.expectedCount);B!==null&&(a.expectedCount=B)}return a}(this.serializer,e);const n=Zy(this.serializer,e);n&&(t.labels=n),this.tn(t)}Pn(e){const t={};t.database=lB(this.serializer),t.removeTarget=e,this.tn(t)}}class gw extends Pg{constructor(e,t,n,s,i,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,s,o),this.serializer=i}get Rn(){return this.zt>0}start(){this.lastStreamToken=void 0,super.start()}sn(){this.Rn&&this.In([])}cn(e,t){return this.connection.St("Write",e,t)}En(e){return H(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,H(!e.writeResults||e.writeResults.length===0,55816),this.listener.An()}onNext(e){H(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.jt.reset();const t=Xy(e.writeResults,e.commitTime),n=at(e.commitTime);return this.listener.Vn(n,t)}dn(){const e={};e.database=lB(this.serializer),this.tn(e)}In(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Ma(this.serializer,n))};this.tn(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mw{}class Ew extends mw{constructor(e,t,n,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=s,this.fn=!1}mn(){if(this.fn)throw new U(x.FAILED_PRECONDITION,"The client has already been terminated.")}tt(e,t,n,s){return this.mn(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.tt(e,BB(t,n),s,i,o)).catch(i=>{throw i.name==="FirebaseError"?(i.code===x.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new U(x.UNKNOWN,i.toString())})}st(e,t,n,s,i){return this.mn(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,a])=>this.connection.st(e,BB(t,n),s,o,a,i)).catch(o=>{throw o.name==="FirebaseError"?(o.code===x.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new U(x.UNKNOWN,o.toString())})}terminate(){this.fn=!0,this.connection.terminate()}}function _w(r,e,t,n){return new Ew(r,e,t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dw="ComponentProvider",Of=new Map;function Iw(r,e,t,n,s){return new dy(r,e,t,s.host,s.ssl,s.experimentalForceLongPolling,s.experimentalAutoDetectLongPolling,Rg(s.experimentalLongPollingOptions),s.useFetchStreams,s.isUsingEmulator,n,s._customHeaders,s.grpcFlowControlWindow)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nf={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Sg=41943040;class Xe{static withCacheSize(e){return new Xe(e,Xe.DEFAULT_COLLECTION_PERCENTILE,Xe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}Xe.DEFAULT_COLLECTION_PERCENTILE=10,Xe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Xe.DEFAULT=new Xe(Sg,Xe.DEFAULT_COLLECTION_PERCENTILE,Xe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Xe.DISABLED=new Xe(-1,0,0);/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lt{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.pn(n),this.gn=n=>t.writeSequenceNumber(n))}pn(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.gn&&this.gn(e),e}}lt.yn=-1;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Og="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Ng{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hr(r){if(r.code!==x.FAILED_PRECONDITION||r.message!==Og)throw r;G("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class b{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&$(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new b((n,s)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(n,s)},this.catchCallback=i=>{this.wrapFailure(t,i).next(n,s)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof b?t:b.resolve(t)}catch(t){return b.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):b.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):b.reject(t)}static resolve(e){return new b((t,n)=>{t(e)})}static reject(e){return new b((t,n)=>{n(e)})}static waitFor(e){return new b((t,n)=>{let s=0,i=0,o=!1;e.forEach(a=>{++s,a.next(()=>{++i,o&&i===s&&t()},c=>n(c))}),o=!0,i===s&&t()})}static or(e){let t=b.resolve(!1);for(const n of e)t=t.next(s=>s?b.resolve(s):n());return t}static forEach(e,t){const n=[];return e.forEach((s,i)=>{n.push(t.call(this,s,i))}),this.waitFor(n)}static mapArray(e,t){return new b((n,s)=>{const i=e.length,o=new Array(i);let a=0;for(let c=0;c<i;c++){const B=c;t(e[B]).next(h=>{o[B]=h,++a,a===i&&n(o)},h=>s(h))}})}static doWhile(e,t){return new b((n,s)=>{const i=()=>{e()===!0?t().next(()=>{i()},s):n()};i()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Et="SimpleDb";class yu{static open(e,t,n,s){try{return new yu(t,e.transaction(s,n))}catch(i){throw new Ui(t,i)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.wn=new Xt,this.transaction.oncomplete=()=>{this.wn.resolve()},this.transaction.onabort=()=>{t.error?this.wn.reject(new Ui(e,t.error)):this.wn.resolve()},this.transaction.onerror=n=>{const s=ol(n.target.error);this.wn.reject(new Ui(e,s))}}get bn(){return this.wn.promise}abort(e){e&&this.wn.reject(e),this.aborted||(G(Et,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}Sn(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new ww(t)}}class $n{static delete(e){return G(Et,"Removing database:",e),Ar(np().indexedDB.deleteDatabase(e)).toPromise()}static Je(){if(!lu())return!1;if($n.vn())return!0;const e=Me(),t=$n.Dn(e),n=0<t&&t<10,s=Fg(e),i=0<s&&s<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||i)}static vn(){return typeof process<"u"&&process.__PRIVATE_env?.__PRIVATE_USE_MOCK_PERSISTENCE==="YES"}static xn(e,t){return e.store(t)}static Dn(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.Cn=n,this.Fn=null,$n.Dn(Me())===12.2&&Se("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async On(e){return this.db||(G(Et,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const s=indexedDB.open(this.name,this.version);s.onsuccess=i=>{const o=i.target.result;t(o)},s.onblocked=()=>{n(new Ui(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},s.onerror=i=>{const o=i.target.error;o.name==="VersionError"?n(new U(x.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new U(x.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new Ui(e,o))},s.onupgradeneeded=i=>{G(Et,'Database "'+this.name+'" requires upgrade from version:',i.oldVersion);const o=i.target.result;this.Cn.Mn(o,s.transaction,i.oldVersion,this.version).next(()=>{G(Et,"Database upgrade to version "+this.version+" complete")})}})),this.Nn&&(this.db.onversionchange=t=>this.Nn(t)),this.db}Ln(e){this.Nn=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,s){const i=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.On(e);const a=yu.open(this.db,e,i?"readonly":"readwrite",n),c=s(a).next(B=>(a.Sn(),B)).catch(B=>(a.abort(B),b.reject(B))).toPromise();return c.catch(()=>{}),await a.bn,c}catch(a){const c=a,B=c.name!=="FirebaseError"&&o<3;if(G(Et,"Transaction failed with error:",c.message,"Retrying:",B),this.close(),!B)return Promise.reject(c)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Fg(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class yw{constructor(e){this.Bn=e,this.Un=!1,this.kn=null}get isDone(){return this.Un}get qn(){return this.kn}set cursor(e){this.Bn=e}done(){this.Un=!0}$n(e){this.kn=e}delete(){return Ar(this.Bn.delete())}}class Ui extends U{constructor(e,t){super(x.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function dr(r){return r.name==="IndexedDbTransactionError"}class ww{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(G(Et,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(G(Et,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),Ar(n)}add(e){return G(Et,"ADD",this.store.name,e,e),Ar(this.store.add(e))}get(e){return Ar(this.store.get(e)).next(t=>(t===void 0&&(t=null),G(Et,"GET",this.store.name,e,t),t))}delete(e){return G(Et,"DELETE",this.store.name,e),Ar(this.store.delete(e))}count(){return G(Et,"COUNT",this.store.name),Ar(this.store.count())}Kn(e,t){const n=this.options(e,t),s=n.index?this.store.index(n.index):this.store;if(typeof s.getAll=="function"){const i=s.getAll(n.range);return new b((o,a)=>{i.onerror=c=>{a(c.target.error)},i.onsuccess=c=>{o(c.target.result)}})}{const i=this.cursor(n),o=[];return this.Qn(i,(a,c)=>{o.push(c)}).next(()=>o)}}Wn(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new b((s,i)=>{n.onerror=o=>{i(o.target.error)},n.onsuccess=o=>{s(o.target.result)}})}Gn(e,t){G(Et,"DELETE ALL",this.store.name);const n=this.options(e,t);n.zn=!1;const s=this.cursor(n);return this.Qn(s,(i,o,a)=>a.delete())}jn(e,t){let n;t?n=e:(n={},t=e);const s=this.cursor(n);return this.Qn(s,t)}Hn(e){const t=this.cursor({});return new b((n,s)=>{t.onerror=i=>{const o=ol(i.target.error);s(o)},t.onsuccess=i=>{const o=i.target.result;o?e(o.primaryKey,o.value).next(a=>{a?o.continue():n()}):n()}})}Qn(e,t){const n=[];return new b((s,i)=>{e.onerror=o=>{i(o.target.error)},e.onsuccess=o=>{const a=o.target.result;if(!a)return void s();const c=new yw(a),B=t(a.primaryKey,a.value,c);if(B instanceof b){const h=B.catch(d=>(c.done(),b.reject(d)));n.push(h)}c.isDone?s():c.qn===null?a.continue():a.continue(c.qn)}}).next(()=>b.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.zn?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Ar(r){return new b((e,t)=>{r.onsuccess=n=>{const s=n.target.result;e(s)},r.onerror=n=>{const s=ol(n.target.error);t(s)}})}let Ff=!1;function ol(r){const e=$n.Dn(Me());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new U("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Ff||(Ff=!0,setTimeout(()=>{throw n},0)),n}}return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lf="LruGarbageCollector",Lg=1048576;function xf([r,e],[t,n]){const s=se(r,t);return s===0?se(e,n):s}class Tw{constructor(e){this.Jn=e,this.buffer=new pe(xf),this.Yn=0}Zn(){return++this.Yn}Xn(e){const t=[e,this.Zn()];if(this.buffer.size<this.Jn)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();xf(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class xg{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.er=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.tr(6e4)}stop(){this.er&&(this.er.cancel(),this.er=null)}get started(){return this.er!==null}tr(e){G(Lf,`Garbage collection scheduled in ${e}ms`),this.er=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.er=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){dr(t)?G(Lf,"Ignoring IndexedDB error during garbage collection: ",t):await hr(t)}await this.tr(3e5)})}}class Aw{constructor(e,t){this.nr=e,this.params=t}calculateTargetCount(e,t){return this.nr.rr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return b.resolve(lt.yn);const n=new Tw(t);return this.nr.forEachTarget(e,s=>n.Xn(s.sequenceNumber)).next(()=>this.nr.ir(e,s=>n.Xn(s))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.nr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.nr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(G("LruGarbageCollector","Garbage collection skipped; disabled"),b.resolve(Nf)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(G("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Nf):this.sr(e,t))}getCacheSize(e){return this.nr.getCacheSize(e)}sr(e,t){let n,s,i,o,a,c,B;const h=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(d=>(d>this.params.maximumSequenceNumbersToCollect?(G("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${d}`),s=this.params.maximumSequenceNumbersToCollect):s=d,o=Date.now(),this.nthSequenceNumber(e,s))).next(d=>(n=d,a=Date.now(),this.removeTargets(e,n,t))).next(d=>(i=d,c=Date.now(),this.removeOrphanedDocuments(e,n))).next(d=>(B=Date.now(),Cs()<=Be.DEBUG&&G("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-h}ms
	Determined least recently used ${s} in `+(a-o)+`ms
	Removed ${i} targets in `+(c-a)+`ms
	Removed ${d} documents in `+(B-c)+`ms
Total Duration: ${B-h}ms`),b.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:i,documentsRemoved:d})))}}function Vg(r,e){return new Aw(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kg="firestore.googleapis.com",Vf=!0;class kf{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new U(x.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=kg,this.ssl=Vf}else this.host=e.host,this.ssl=e.ssl??Vf;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e._customHeaders&&(this._customHeaders={...e._customHeaders}),e.cacheSizeBytes===void 0)this.cacheSizeBytes=Sg;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Lg)throw new U(x.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}if(ly("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Rg(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new U(x.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new U(x.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new U(x.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams,e.grpcFlowControlWindow!==void 0){if(typeof e.grpcFlowControlWindow!="number"||e.grpcFlowControlWindow<=0||e.grpcFlowControlWindow>2147483647||!Number.isInteger(e.grpcFlowControlWindow))throw new U(x.INVALID_ARGUMENT,"grpcFlowControlWindow must be a positive integer and cannot exceed 2147483647");this.grpcFlowControlWindow=e.grpcFlowControlWindow}}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,s){return n.timeoutSeconds===s.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams&&this.grpcFlowControlWindow===e.grpcFlowControlWindow&&function(n,s){if(n===s)return!0;if(!n||!s)return!1;const i=Object.keys(n),o=Object.keys(s);if(i.length!==o.length)return!1;for(const a of i)if(n[a]!==s[a])return!1;return!0}(this._customHeaders,e._customHeaders)}}let wu=class{constructor(e,t,n,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new kf({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new U(x.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new U(x.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new kf(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new iw;switch(n.type){case"firstParty":return new cw(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new U(x.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=Of.get(t);n&&(G(Dw,"Removing Datastore"),Of.delete(t),n.terminate())}(this),Promise.resolve()}};function vw(r,e,t,n={}){r=It(r,wu);const s=Ks(e),i=r._getSettings(),o={...i,emulatorOptions:r._getEmulatorOptions()},a=`${e}:${t}`;s&&kB(`https://${a}`),i.host!==kg&&i.host!==a&&Nt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const c={...i,host:a,ssl:s,emulatorOptions:n};if(!fn(c,o)&&(r._setSettings(c),n.mockUserToken)){let B,h;if(typeof n.mockUserToken=="string")B=n.mockUserToken,h=qe.MOCK_USER;else{B=aD(n.mockUserToken,r._app?.options.projectId);const d=n.mockUserToken.sub||n.mockUserToken.user_id;if(!d)throw new U(x.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");h=new qe(d)}r._authCredentials=new ow(new vg(B,h))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yr{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Yr(this.firestore,e,this._query)}}class ve{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Qn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new ve(this.firestore,e,this._key)}toJSON(){return{type:ve._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(wo(t,ve._jsonSchema))return new ve(e,n||null,new q(ue.fromString(t.referencePath)))}}ve._jsonSchemaVersion="firestore/documentReference/1.0",ve._jsonSchema={type:Ne("string",ve._jsonSchemaVersion),referencePath:Ne("string")};class Qn extends Yr{constructor(e,t,n){super(e,t,vo(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ve(this.firestore,null,new q(e))}withConverter(e){return new Qn(this.firestore,e,this._path)}}function a0(r,e,...t){if(r=Te(r),Op("collection","path",e),r instanceof wu){const n=ue.fromString(e,...t);return af(n),new Qn(r,null,n)}{if(!(r instanceof ve||r instanceof Qn))throw new U(x.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(ue.fromString(e,...t));return af(n),new Qn(r.firestore,null,n)}}function u0(r,e,...t){if(r=Te(r),arguments.length===1&&(e=qB.newId()),Op("doc","path",e),r instanceof wu){const n=ue.fromString(e,...t);return of(n),new ve(r,null,new q(n))}{if(!(r instanceof ve||r instanceof Qn))throw new U(x.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(ue.fromString(e,...t));return of(n),new ve(r.firestore,r instanceof Qn?r.converter:null,new q(n))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ht{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,s){if(n.length!==s.length)return!1;for(let i=0;i<n.length;++i)if(n[i]!==s[i])return!1;return!0}(this._values,e._values)}toJSON(){return{type:ht._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(wo(e,ht._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new ht(e.vectorValues);throw new U(x.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}ht._jsonSchemaVersion="firestore/vectorValue/1.0",ht._jsonSchema={type:Ne("string",ht._jsonSchemaVersion),vectorValues:Ne("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rw=/^__.*__$/;class bw{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Dn(e,this.data,this.fieldMask,t,this.fieldTransforms):new Qs(e,this.data,t,this.fieldTransforms)}}class Mg{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Dn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Gg(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw $(40011,{dataSource:r})}}class al{constructor(e,t,n,s,i,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=s,i===void 0&&this.validatePath(),this.fieldTransforms=i||[],this.fieldMask=o||[]}get path(){return this.settings.path}get dataSource(){return this.settings.dataSource}contextWith(e){return new al({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}childContextForField(e){const t=this.path?.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePathSegment(e),n}childContextForFieldPath(e){const t=this.path?.child(e),n=this.contextWith({path:t,arrayElement:!1});return n.validatePath(),n}childContextForArray(e){return this.contextWith({path:void 0,arrayElement:!0})}createError(e){return Ga(e,this.settings.methodName,this.settings.hasConverter||!1,this.path,this.settings.targetDoc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}validatePath(){if(this.path)for(let e=0;e<this.path.length;e++)this.validatePathSegment(this.path.get(e))}validatePathSegment(e){if(e.length===0)throw this.createError("Document fields must not be empty");if(Gg(this.dataSource)&&Rw.test(e))throw this.createError('Document fields cannot begin and end with "__"')}}class Pw{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||Du(e)}createContext(e,t,n,s=!1){return new al({dataSource:e,methodName:t,targetDoc:n,path:ke.emptyPath(),arrayElement:!1,hasConverter:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function ul(r){const e=r._freezeSettings(),t=Du(r._databaseId);return new Pw(r._databaseId,!!e.ignoreUndefinedProperties,t)}function Sw(r,e,t,n,s,i={}){const o=r.createContext(i.merge||i.mergeFields?2:0,e,t,s);cl("Data must be an object, but it was:",o,n);const a=Ug(n,o);let c,B;if(i.merge)c=new Bt(o.fieldMask),B=o.fieldTransforms;else if(i.mergeFields){const h=[];for(const d of i.mergeFields){const C=nr(e,d,t);if(!o.contains(C))throw new U(x.INVALID_ARGUMENT,`Field '${C}' is specified in your field mask but missing from your input data.`);qg(h,C)||h.push(C)}c=new Bt(h),B=o.fieldTransforms.filter(d=>c.covers(d.field))}else c=null,B=o.fieldTransforms;return new bw(new ze(a),c,B)}class Tu extends il{_toFieldTransform(e){if(e.dataSource!==2)throw e.dataSource===1?e.createError(`${this._methodName}() can only appear at the top level of your update data`):e.createError(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Tu}}function Ow(r,e,t,n){const s=r.createContext(1,e,t);cl("Data must be an object, but it was:",s,n);const i=[],o=ze.empty();lr(n,(c,B)=>{const h=jg(e,c,t);B=Te(B);const d=s.childContextForFieldPath(h);if(B instanceof Tu)i.push(h);else{const C=tr(B,d);C!=null&&(i.push(h),o.set(h,C))}});const a=new Bt(i);return new Mg(o,a,s.fieldTransforms)}function Nw(r,e,t,n,s,i){const o=r.createContext(1,e,t),a=[nr(e,n,t)],c=[s];if(i.length%2!=0)throw new U(x.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let C=0;C<i.length;C+=2)a.push(nr(e,i[C])),c.push(i[C+1]);const B=[],h=ze.empty();for(let C=a.length-1;C>=0;--C)if(!qg(B,a[C])){const I=a[C];let R=c[C];R=Te(R);const N=o.childContextForFieldPath(I);if(R instanceof Tu)B.push(I);else{const M=tr(R,N);M!=null&&(B.push(I),h.set(I,M))}}const d=new Bt(B);return new Mg(h,d,o.fieldTransforms)}function Fw(r,e,t,n=!1){return tr(t,r.createContext(n?4:3,e))}function tr(r,e,t){if(Hg(r=Te(r)))return cl("Unsupported field value:",e,r),Ug(r,e);if(r instanceof il)return function(s,i){if(!Gg(i.dataSource))throw i.createError(`${s._methodName}() can only be used with update() and set()`);if(!i.path)throw i.createError(`${s._methodName}() is not currently supported inside arrays`);const o=s._toFieldTransform(i);o&&i.fieldTransforms.push(o)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.arrayElement&&e.dataSource!==4)throw e.createError("Nested arrays are not supported");return function(s,i){const o=[];let a=0;for(const c of s){let B=tr(c,i.childContextForArray(a));B==null&&(B={nullValue:"NULL_VALUE"}),o.push(B),a++}return{arrayValue:{values:o}}}(r,e)}return function(s,i,o){if((s=Te(s))===null)return{nullValue:"NULL_VALUE"};if(typeof s=="number")return $B(i.serializer,s);if(typeof s=="boolean")return{booleanValue:s};if(typeof s=="string")return{stringValue:s};if(s instanceof Date){const a=ge.fromDate(s);return{timestampValue:xs(i.serializer,a)}}if(s instanceof ge){const a=new ge(s.seconds,1e3*Math.floor(s.nanoseconds/1e3));return{timestampValue:xs(i.serializer,a)}}if(s instanceof Yt)return{geoPointValue:{latitude:s.latitude,longitude:s.longitude}};if(s instanceof St)return{bytesValue:dg(i.serializer,s._byteString)};if(s instanceof ve){const a=i.databaseId,c=s.firestore._databaseId;if(!c.isEqual(a))throw i.createError(`Document reference is for database ${c.projectId}/${c.database} but should be for database ${a.projectId}/${a.database}`);return{referenceValue:sl(s.firestore._databaseId||i.databaseId,s._key.path)}}if(s instanceof ht)return function(c,B){const h=c instanceof ht?c.toArray():c;return{mapValue:{fields:{[JB]:{stringValue:KB},[jr]:{arrayValue:{values:h.map(C=>{if(typeof C!="number")throw B.createError("VectorValues must only contain numeric values.");return pu(B.serializer,C)})}}}}}}(s,i);if(Tg(s))return s._toProto(i.serializer);throw i.createError(`Unsupported field value: ${du(s)}`)}(r,e)}function Ug(r,e){const t={};return Sp(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):lr(r,(n,s)=>{const i=tr(s,e.childContextForField(n));i!=null&&(t[n]=i)}),{mapValue:{fields:t}}}function Hg(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof ge||r instanceof Yt||r instanceof St||r instanceof ve||r instanceof il||r instanceof ht||Tg(r))}function cl(r,e,t){if(!Hg(t)||!yo(t)){const n=du(t);throw n==="an object"?e.createError(r+" a custom object"):e.createError(r+" "+n)}}function nr(r,e,t){if((e=Te(e))instanceof Iu)return e._internalPath;if(typeof e=="string")return jg(r,e);throw Ga("Field path arguments must be of type string or ",r,!1,void 0,t)}const Lw=new RegExp("[~\\*/\\[\\]]");function jg(r,e,t){if(e.search(Lw)>=0)throw Ga(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Iu(...e.split("."))._internalPath}catch{throw Ga(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ga(r,e,t,n,s){const i=n&&!n.isEmpty(),o=s!==void 0;let a=`Function ${e}() called with invalid data`;t&&(a+=" (via `toFirestore()`)"),a+=". ";let c="";return(i||o)&&(c+=" (found",i&&(c+=` in field ${n}`),o&&(c+=` in document ${s}`),c+=")"),new U(x.INVALID_ARGUMENT,a+r+c)}function qg(r,e){return r.some(t=>t.isEqual(e))}function Jg(r){return typeof r._readUserData=="function"}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nt{constructor(e){this.optionDefinitions=e}_getKnownOptions(e,t){const n=ze.empty();for(const s in this.optionDefinitions)if(this.optionDefinitions.hasOwnProperty(s)){const i=this.optionDefinitions[s];if(s in e){const o=e[s];let a;i.nestedOptions&&yo(o)?a={mapValue:{fields:new nt(i.nestedOptions).getOptionsProto(t,o)}}:o&&(a=tr(o,t)??void 0),a&&n.set(ke.fromServerFormat(i.serverName),a)}}return n}getOptionsProto(e,t,n){const s=this._getKnownOptions(t,e);if(n){const i=new Map(By(n,(o,a)=>[ke.fromServerFormat(a),o!==void 0?tr(o,e):null]));s.setAll(i)}return s.value.mapValue.fields??{}}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xw(r){return typeof r=="object"&&r!==null&&!!("nullValue"in r&&(r.nullValue===null||r.nullValue==="NULL_VALUE")||"booleanValue"in r&&(r.booleanValue===null||typeof r.booleanValue=="boolean")||"integerValue"in r&&(r.integerValue===null||typeof r.integerValue=="number"||typeof r.integerValue=="string")||"doubleValue"in r&&(r.doubleValue===null||typeof r.doubleValue=="number")||"timestampValue"in r&&(r.timestampValue===null||function(t){return typeof t=="object"&&t!==null&&"seconds"in t&&(t.seconds===null||typeof t.seconds=="number"||typeof t.seconds=="string")&&"nanos"in t&&(t.nanos===null||typeof t.nanos=="number")}(r.timestampValue))||"stringValue"in r&&(r.stringValue===null||typeof r.stringValue=="string")||"bytesValue"in r&&(r.bytesValue===null||r.bytesValue instanceof Uint8Array)||"referenceValue"in r&&(r.referenceValue===null||typeof r.referenceValue=="string")||"geoPointValue"in r&&(r.geoPointValue===null||function(t){return typeof t=="object"&&t!==null&&"latitude"in t&&(t.latitude===null||typeof t.latitude=="number")&&"longitude"in t&&(t.longitude===null||typeof t.longitude=="number")}(r.geoPointValue))||"arrayValue"in r&&(r.arrayValue===null||function(t){return typeof t=="object"&&t!==null&&!(!("values"in t)||t.values!==null&&!Array.isArray(t.values))}(r.arrayValue))||"mapValue"in r&&(r.mapValue===null||function(t){return typeof t=="object"&&t!==null&&!(!("fields"in t)||t.fields!==null&&!yo(t.fields))}(r.mapValue))||"fieldReferenceValue"in r&&(r.fieldReferenceValue===null||typeof r.fieldReferenceValue=="string")||"functionValue"in r&&(r.functionValue===null||function(t){return typeof t=="object"&&t!==null&&!(!("name"in t)||t.name!==null&&typeof t.name!="string"||!("args"in t)||t.args!==null&&!Array.isArray(t.args))}(r.functionValue))||"pipelineValue"in r&&(r.pipelineValue===null||function(t){return typeof t=="object"&&t!==null&&!(!("stages"in t)||t.stages!==null&&!Array.isArray(t.stages))}(r.pipelineValue)))}function Vw(r){return new ht(r)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function j(r){let e;return r instanceof Xr?r:(e=yo(r)?Hw(r):r instanceof Array?jw(r):Kg(r,void 0),e)}function bc(r){if(r instanceof Xr)return r;if(r instanceof ht)return oo(r);if(Array.isArray(r))return oo(Vw(r));throw new Error("Unsupported value: "+typeof r)}function Bl(r){return Cy(r)?Da(r):j(r)}class Xr{constructor(){this._protoValueType="ProtoValue"}add(e){return new V("add",[this,j(e)],"add")}asBoolean(){if(this instanceof rr)return this;if(this instanceof es)return new $g(this);if(this instanceof Zr)return new Uw(this);if(this instanceof V)return new zg(this);throw new U("invalid-argument",`Conversion of type ${typeof this} to BooleanExpression not supported.`)}subtract(e){return new V("subtract",[this,j(e)],"subtract")}multiply(e){return new V("multiply",[this,j(e)],"multiply")}divide(e){return new V("divide",[this,j(e)],"divide")}mod(e){return new V("mod",[this,j(e)],"mod")}equal(e){return new V("equal",[this,j(e)],"equal").asBoolean()}notEqual(e){return new V("not_equal",[this,j(e)],"notEqual").asBoolean()}lessThan(e){return new V("less_than",[this,j(e)],"lessThan").asBoolean()}lessThanOrEqual(e){return new V("less_than_or_equal",[this,j(e)],"lessThanOrEqual").asBoolean()}greaterThan(e){return new V("greater_than",[this,j(e)],"greaterThan").asBoolean()}greaterThanOrEqual(e){return new V("greater_than_or_equal",[this,j(e)],"greaterThanOrEqual").asBoolean()}arrayConcat(e,...t){const n=[e,...t].map(s=>j(s));return new V("array_concat",[this,...n],"arrayConcat")}arrayContains(e){return new V("array_contains",[this,j(e)],"arrayContains").asBoolean()}arrayContainsAll(e){const t=Array.isArray(e)?new Oi(e.map(j),"arrayContainsAll"):e;return new V("array_contains_all",[this,t],"arrayContainsAll").asBoolean()}arrayContainsAny(e){const t=Array.isArray(e)?new Oi(e.map(j),"arrayContainsAny"):e;return new V("array_contains_any",[this,t],"arrayContainsAny").asBoolean()}arrayReverse(){return new V("array_reverse",[this])}arrayLength(){return new V("array_length",[this],"arrayLength")}equalAny(e){const t=Array.isArray(e)?new Oi(e.map(j),"equalAny"):e;return new V("equal_any",[this,t],"equalAny").asBoolean()}notEqualAny(e){const t=Array.isArray(e)?new Oi(e.map(j),"notEqualAny"):e;return new V("not_equal_any",[this,t],"notEqualAny").asBoolean()}exists(){return new V("exists",[this],"exists").asBoolean()}charLength(){return new V("char_length",[this],"charLength")}like(e){return new V("like",[this,j(e)],"like").asBoolean()}regexContains(e){return new V("regex_contains",[this,j(e)],"regexContains").asBoolean()}regexFind(e){return new V("regex_find",[this,j(e)],"regexFind")}regexFindAll(e){return new V("regex_find_all",[this,j(e)],"regexFindAll")}regexMatch(e){return new V("regex_match",[this,j(e)],"regexMatch").asBoolean()}stringContains(e){return new V("string_contains",[this,j(e)],"stringContains").asBoolean()}startsWith(e){return new V("starts_with",[this,j(e)],"startsWith").asBoolean()}endsWith(e){return new V("ends_with",[this,j(e)],"endsWith").asBoolean()}toLower(){return new V("to_lower",[this],"toLower")}toUpper(){return new V("to_upper",[this],"toUpper")}trim(e){const t=[this];return e&&t.push(j(e)),new V("trim",t,"trim")}ltrim(e){const t=[this];return e&&t.push(j(e)),new V("ltrim",t,"ltrim")}rtrim(e){const t=[this];return e&&t.push(j(e)),new V("rtrim",t,"rtrim")}type(){return new V("type",[this])}isType(e){return new V("is_type",[this,oo(e)],"isType").asBoolean()}stringConcat(e,...t){const n=[e,...t].map(j);return new V("string_concat",[this,...n],"stringConcat")}stringIndexOf(e){return new V("string_index_of",[this,j(e)],"stringIndexOf")}stringRepeat(e){return new V("string_repeat",[this,j(e)],"stringRepeat")}stringReplaceAll(e,t){return new V("string_replace_all",[this,j(e),j(t)],"stringReplaceAll")}stringReplaceOne(e,t){return new V("string_replace_one",[this,j(e),j(t)],"stringReplaceOne")}concat(e,...t){const n=[e,...t].map(j);return new V("concat",[this,...n],"concat")}reverse(){return new V("reverse",[this],"reverse")}arrayFilter(e,t){return new V("array_filter",[this,j(e),t],"arrayFilter")}arrayTransform(e,t){return new V("array_transform",[this,j(e),t],"arrayTransform")}arrayTransformWithIndex(e,t,n){return new V("array_transform",[this,j(e),j(t),n],"arrayTransformWithIndex")}arraySlice(e,t){const n=[this,j(e)];return t!==void 0&&n.push(j(t)),new V("array_slice",n,"arraySlice")}arrayFirst(){return new V("array_first",[this],"arrayFirst")}arrayFirstN(e){return new V("array_first_n",[this,j(e)],"arrayFirstN")}arrayLast(){return new V("array_last",[this],"arrayLast")}arrayLastN(e){return new V("array_last_n",[this,j(e)],"arrayLastN")}arrayMaximum(){return new V("maximum",[this],"arrayMaximum")}arrayMaximumN(e){return new V("maximum_n",[this,j(e)],"arrayMaximumN")}arrayMinimum(){return new V("minimum",[this],"arrayMinimum")}arrayMinimumN(e){return new V("minimum_n",[this,j(e)],"arrayMinimumN")}arrayIndexOf(e){return new V("array_index_of",[this,j(e),j("first")],"arrayIndexOf")}arrayLastIndexOf(e){return new V("array_index_of",[this,j(e),j("last")],"arrayLastIndexOf")}arrayIndexOfAll(e){return new V("array_index_of_all",[this,j(e)],"arrayIndexOfAll")}byteLength(){return new V("byte_length",[this],"byteLength")}ceil(){return new V("ceil",[this])}floor(){return new V("floor",[this])}abs(){return new V("abs",[this])}exp(){return new V("exp",[this])}mapGet(e){return new V("map_get",[this,oo(e)],"mapGet")}mapSet(e,t,...n){const s=[this,j(e),j(t),...n.map(j)];return new V("map_set",s,"mapSet")}mapKeys(){return new V("map_keys",[this],"mapKeys")}mapValues(){return new V("map_values",[this],"mapValues")}mapEntries(){return new V("map_entries",[this],"mapEntries")}getField(e){return new V("get_field",[this,j(e)],"get_field")}count(){return mt._create("count",[this],"count")}sum(){return mt._create("sum",[this],"sum")}average(){return mt._create("average",[this],"average")}minimum(){return mt._create("minimum",[this],"minimum")}maximum(){return mt._create("maximum",[this],"maximum")}first(){return mt._create("first",[this],"first")}last(){return mt._create("last",[this],"last")}arrayAgg(){return mt._create("array_agg",[this],"arrayAgg")}arrayAggDistinct(){return mt._create("array_agg_distinct",[this],"arrayAggDistinct")}countDistinct(){return mt._create("count_distinct",[this],"countDistinct")}logicalMaximum(e,...t){const n=[e,...t];return new V("maximum",[this,...n.map(j)],"logicalMaximum")}logicalMinimum(e,...t){const n=[e,...t];return new V("minimum",[this,...n.map(j)],"minimum")}vectorLength(){return new V("vector_length",[this],"vectorLength")}cosineDistance(e){return new V("cosine_distance",[this,bc(e)],"cosineDistance")}dotProduct(e){return new V("dot_product",[this,bc(e)],"dotProduct")}euclideanDistance(e){return new V("euclidean_distance",[this,bc(e)],"euclideanDistance")}unixMicrosToTimestamp(){return new V("unix_micros_to_timestamp",[this],"unixMicrosToTimestamp")}timestampToUnixMicros(){return new V("timestamp_to_unix_micros",[this],"timestampToUnixMicros")}unixMillisToTimestamp(){return new V("unix_millis_to_timestamp",[this],"unixMillisToTimestamp")}timestampToUnixMillis(){return new V("timestamp_to_unix_millis",[this],"timestampToUnixMillis")}unixSecondsToTimestamp(){return new V("unix_seconds_to_timestamp",[this],"unixSecondsToTimestamp")}timestampToUnixSeconds(){return new V("timestamp_to_unix_seconds",[this],"timestampToUnixSeconds")}timestampAdd(e,t){return new V("timestamp_add",[this,j(e),j(t)],"timestampAdd")}timestampSubtract(e,t){return new V("timestamp_subtract",[this,j(e),j(t)],"timestampSubtract")}timestampDiff(e,t){return new V("timestamp_diff",[this,Bl(e),j(t)],"timestampDiff")}timestampExtract(e,t){const n=[this,j(e)];return t&&n.push(j(t)),new V("timestamp_extract",n,"timestampExtract")}documentId(){return new V("document_id",[this],"documentId")}parent(){return new V("parent",[this],"parent")}substring(e,t){const n=j(e);return new V("substring",t===void 0?[this,n]:[this,n,j(t)],"substring")}arrayGet(e){return new V("array_get",[this,j(e)],"arrayGet")}isError(){return new V("is_error",[this],"isError").asBoolean()}ifError(e){const t=new V("if_error",[this,j(e)],"ifError");return e instanceof rr?t.asBoolean():t}isAbsent(){return new V("is_absent",[this],"isAbsent").asBoolean()}mapRemove(e){return new V("map_remove",[this,j(e)],"mapRemove")}mapMerge(e,...t){const n=j(e),s=t.map(j);return new V("map_merge",[this,n,...s],"mapMerge")}pow(e){return new V("pow",[this,j(e)])}trunc(e){return e===void 0?new V("trunc",[this]):new V("trunc",[this,j(e)],"trunc")}round(e){return e===void 0?new V("round",[this]):new V("round",[this,j(e)],"round")}collectionId(){return new V("collection_id",[this])}length(){return new V("length",[this])}ln(){return new V("ln",[this])}sqrt(){return new V("sqrt",[this])}stringReverse(){return new V("string_reverse",[this])}ifAbsent(e){return new V("if_absent",[this,j(e)],"ifAbsent")}ifNull(e){return new V("if_null",[this,j(e)],"ifNull")}coalesce(e,...t){return new V("coalesce",[this,j(e),...t.map(j)],"coalesce")}join(e){return new V("join",[this,j(e)],"join")}log10(){return new V("log10",[this])}arraySum(){return new V("sum",[this])}split(e){return new V("split",[this,j(e)])}timestampTruncate(e,t){const n=[this,j(e)];return t&&n.push(j(t)),new V("timestamp_trunc",n)}ascending(){return qw(this)}descending(){return Jw(this)}as(e){return new Mw(this,e,"as")}}class mt{constructor(e,t){this.name=e,this.params=t,this.exprType="AggregateFunction",this._protoValueType="ProtoValue"}static _create(e,t,n){const s=new mt(e,t);return s._methodName=n,s}as(e){return new kw(this,e,"as")}_toProto(e){return{functionValue:{name:this.name,args:this.params.map(t=>t._toProto(e))}}}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,this.params.forEach(t=>t._readUserData(e))}}class kw{constructor(e,t,n){this.aggregate=e,this.alias=t,this._methodName=n}_readUserData(e){this.aggregate._readUserData(e)}}class Mw{constructor(e,t,n){this.expr=e,this.alias=t,this._methodName=n,this.exprType="AliasedExpression",this.selectable=!0}_readUserData(e){this.expr._readUserData(e)}}class Oi extends Xr{constructor(e,t){super(),this.ur=e,this._methodName=t,this.expressionType="ListOfExpressions"}_toProto(e){return{arrayValue:{values:this.ur.map(t=>t._toProto(e))}}}_readUserData(e){this.ur.forEach(t=>t._readUserData(e))}}class Zr extends Xr{constructor(e,t){super(),this.fieldPath=e,this._methodName=t,this.expressionType="Field",this.selectable=!0}get _fieldPath(){return this.fieldPath}get fieldName(){return this.fieldPath.canonicalString()}get alias(){return this.fieldName}get expr(){return this}geoDistance(e){return new V("geo_distance",[this,j(e)],"geoDistance")}_toProto(e){return{fieldReferenceValue:this.fieldPath.canonicalString()}}_readUserData(e){}}function Da(r){return Gw(r,"field")}function Gw(r,e){return new Zr(typeof r=="string"?Jt===r?sw()._internalPath:nr("field",r):r._internalPath,e)}class es extends Xr{constructor(e,t){super(),this.value=e,this._methodName=t,this.expressionType="Constant"}static _fromProto(e){const t=new es(e,void 0);return t._protoValue=e,t}_toProto(e){return H(this._protoValue!==void 0,237),this._protoValue}_getValue(){return this._protoValue}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,xw(this._protoValue)||(this._protoValue=tr(this.value,e))}}function oo(r,e){return Kg(r,"constant")}function Kg(r,e){const t=new es(r,e);return typeof r=="boolean"?new $g(t):t}class V extends Xr{constructor(e,t,n,s){super(),this.name=e,this.params=t,this.expressionType="Function",this._optionsProto=void 0,n!==void 0&&(this._methodName=n),s!==void 0&&(this._options=s)}get _optionsUtil(){return new nt({})}_toProto(e){const t={functionValue:{name:this.name,args:this.params.map(n=>n._toProto(e))}};return this._optionsProto&&(t.functionValue.options=this._optionsProto),t}_readUserData(e){e=this._methodName?e.contextWith({methodName:this._methodName}):e,this.params.forEach(t=>t._readUserData(e)),this._options&&(this._optionsProto=this._optionsUtil.getOptionsProto(e,this._options))}}class rr extends Xr{get _methodName(){return this._expr._methodName}countIf(){return mt._create("count_if",[this],"countIf")}not(){return new V("not",[this],"not").asBoolean()}conditional(e,t){return new V("conditional",[this,e,t],"conditional")}ifError(e){const t=j(e),n=new V("if_error",[this,t],"ifError");return t instanceof rr?n.asBoolean():n}_toProto(e){return this._expr._toProto(e)}_readUserData(e){this._expr._readUserData(e)}}class zg extends rr{constructor(e){super(),this._expr=e,this.expressionType="Function"}}class $g extends rr{constructor(e){super(),this._expr=e,this.expressionType="Constant"}_getValue(){return this._expr._getValue()}}class Uw extends rr{constructor(e){super(),this._expr=e,this.expressionType="Field"}}function Hw(r,e){const t=[];for(const n in r)if(Object.prototype.hasOwnProperty.call(r,n)){const s=r[n];t.push(oo(n)),t.push(j(s))}return new V("map",t,"map")}function jw(r){return function(t,n){return new V("array",t.map(s=>j(s)),n)}(r,"array")}function qw(r){return new ll(Bl(r),"ascending","ascending")}function Jw(r){return new ll(Bl(r),"descending","descending")}class ll{constructor(e,t,n){this.expr=e,this.direction=t,this._methodName=n,this._protoValueType="ProtoValue"}_toProto(e){return{mapValue:{fields:{direction:Ag(this.direction),expression:this.expr._toProto(e)}}}}_readUserData(e){this.expr._readUserData(e)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(e){this.optionsProto=void 0,{rawOptions:this.rawOptions,...this.knownOptions}=e}_readUserData(e){this.optionsProto=this._optionsUtil.getOptionsProto(e,this.knownOptions,this.rawOptions)}_toProto(e){return{name:this._name,options:this.optionsProto}}}class Qg extends At{get _name(){return"add_fields"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.fields=e}_toProto(e){return{...super._toProto(e),args:[io(e,this.fields)]}}_readUserData(e){super._readUserData(e),ir(this.fields,e)}}class Wg extends At{get _name(){return"aggregate"}get _optionsUtil(){return new nt({})}constructor(e,t,n){super(n),this.groups=e,this.accumulators=t}_toProto(e){return{...super._toProto(e),args:[io(e,this.accumulators),io(e,this.groups)]}}_readUserData(e){super._readUserData(e),ir(this.groups,e),ir(this.accumulators,e)}}class Yg extends At{get _name(){return"distinct"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.groups=e}_toProto(e){return{...super._toProto(e),args:[io(e,this.groups)]}}_readUserData(e){super._readUserData(e),ir(this.groups,e)}}class bo extends At{get _name(){return"collection"}get _optionsUtil(){return new nt({forceIndex:{serverName:"force_index"}})}constructor(e,t){super(t),this.Er=e.startsWith("/")?e:"/"+e}_toProto(e){return{...super._toProto(e),args:[{referenceValue:this.Er}]}}_readUserData(e){super._readUserData(e)}}class Po extends At{get _name(){return"collection_group"}get _optionsUtil(){return new nt({forceIndex:{serverName:"force_index"}})}constructor(e,t){super(t),this.collectionId=e}_toProto(e){return{...super._toProto(e),args:[{referenceValue:""},{stringValue:this.collectionId}]}}_readUserData(e){super._readUserData(e)}}class Au extends At{get _name(){return"database"}get _optionsUtil(){return new nt({})}_toProto(e){return{...super._toProto(e)}}_readUserData(e){super._readUserData(e)}}class vu extends At{get _name(){return"documents"}get _optionsUtil(){return new nt({})}constructor(e,t){if(super(t),!e||e.length===0)throw new U(x.INVALID_ARGUMENT,"Empty document paths are not allowed in DocumentsSource");const n=e.map(i=>i.startsWith("/")?i:"/"+i),s=new Set(n);if(s.size!==n.length)throw new U(x.INVALID_ARGUMENT,"Duplicate document paths are not allowed in DocumentsSource");this.hr=n,this.Tr=s}_toProto(e){return{...super._toProto(e),args:this.hr.map(t=>({referenceValue:t}))}}_readUserData(e){super._readUserData(e)}}class So extends At{get _name(){return"where"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.condition=e}_toProto(e){return{...super._toProto(e),args:[this.condition._toProto(e)]}}_readUserData(e){super._readUserData(e),ir(this.condition,e)}}class sr extends At{get _name(){return"limit"}get _optionsUtil(){return new nt({})}constructor(e,t){H(!isNaN(e)&&e!==1/0&&e!==-1/0,34860),super(t),this.limit=e}_toProto(e){return{...super._toProto(e),args:[$B(e,this.limit)]}}}class Mf extends At{get _name(){return"offset"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.offset=e}_toProto(e){return{...super._toProto(e),args:[$B(e,this.offset)]}}}class Kw extends At{get _name(){return"select"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.selections=e}_toProto(e){return{...super._toProto(e),args:[io(e,this.selections)]}}_readUserData(e){super._readUserData(e),ir(this.selections,e)}}class zt extends At{get _name(){return"sort"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.orderings=e}_toProto(e){return{...super._toProto(e),args:this.orderings.map(t=>t._toProto(e))}}_readUserData(e){super._readUserData(e),ir(this.orderings,e)}}class hl extends At{get _name(){return"replace_with"}get _optionsUtil(){return new nt({})}constructor(e,t){super(t),this.map=e}_toProto(e){return{...super._toProto(e),args:[this.map._toProto(e),Ag(hl.Pr)]}}_readUserData(e){super._readUserData(e),ir(this.map,e)}}hl.Pr="full_replace";function ir(r,e){return Jg(r)?r._readUserData(e):Array.isArray(r)?r.forEach(t=>t._readUserData(e)):r instanceof Map?r.forEach(t=>t._readUserData(e)):Object.values(r).forEach(t=>t._readUserData(e)),r}/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hi{constructor(e,t,n,s){this._db=e,this.userDataReader=t,this._userDataWriter=n,this.stages=s}Ar(e,t){const n=this.userDataReader.createContext(3,e);return Jg(t)?t._readUserData(n):Array.isArray(t)?t.forEach(s=>s._readUserData(n)):t.forEach(s=>s._readUserData(n)),t}where(e){const t=this.stages.map(n=>n);return this.Ar("where",e),t.push(new So(e,{})),new Hi(this._db,this.userDataReader,this._userDataWriter,t)}limit(e){const t=this.stages.map(n=>n);return t.push(new sr(e,{})),new Hi(this._db,this.userDataReader,this._userDataWriter,t)}sort(e,...t){const n=this.stages.map(s=>s);return"orderings"in e?n.push(new zt(this.Ar("sort",e.orderings),{})):n.push(new zt(this.Ar("sort",[e,...t]),{})),new Hi(this._db,this.userDataReader,this._userDataWriter,n)}Vr(e){return{pipeline:{stages:this.stages.map(t=>t._toProto(e))}}}}// Copyright 2024 Google LLC* @license
class Ze{constructor(e,t,n){this.serializer=e,this.stages=t,this.listenOptions=n,this.isCorePipeline=!0}getPipelineCollection(){return Oo(this)}getPipelineCollectionGroup(){return dl(this)}getPipelineCollectionId(){return Xg(this)}getPipelineDocuments(){return Ua(this)}getPipelineFlavor(){return function(t){let n="exact";return t.stages.forEach((s,i)=>{s._name!==Yg.name&&s._name!==Wg.name||(n="keyless"),s._name===Kw.name&&n==="exact"&&(n="augmented"),s._name===Qg.name&&i<t.stages.length-1&&n==="exact"&&(n="augmented")}),n}(this)}getPipelineSourceType(){return hn(this)}}function hn(r){const e=r.stages[0];return e instanceof bo||e instanceof Po||e instanceof Au||e instanceof vu?e._name:"unknown"}function Oo(r){if(hn(r)==="collection")return r.stages[0].Er}function dl(r){if(hn(r)==="collection_group")return r.stages[0].collectionId}function Xg(r){switch(hn(r)){case"collection":return ue.fromString(Oo(r)).lastSegment();case"collection_group":return dl(r);default:return}}function Ua(r){if(hn(r)==="documents")return r.stages[0].hr}class T{constructor(e,t){this.type=e,this.value=t}static dr(){return new T("ERROR",void 0)}static mr(){return new T("UNSET",void 0)}static pr(){return new T("NULL",Wt)}static newValue(e){return Dt(e)?new T("NULL",Wt):function(n){return!!n&&"booleanValue"in n}(e)?new T("BOOLEAN",e):Kt(e)?new T("INT",e):Sr(e)?new T("DOUBLE",e):function(n){return!!n&&"timestampValue"in n&&!!n.timestampValue}(e)?new T("TIMESTAMP",e):function(n){return!!n&&"stringValue"in n}(e)?new T("STRING",e):function(n){return!!n&&"bytesValue"in n}(e)?new T("BYTES",e):e.referenceValue?new T("REFERENCE",e):e.geoPointValue?new T("GEO_POINT",e):er(e)?new T("ARRAY",e):qr(e)?new T("VECTOR",e):Lr(e)?new T("MAP",e):new T("ERROR",void 0)}gr(){return this.type==="ERROR"||this.type==="UNSET"}yr(){return this.type==="NULL"}}function ji(r){if(!r.gr())return r.value}function Zg(r){return r instanceof rr?r._expr:r}function ne(r){if((r=Zg(r))instanceof Zr)return new zw(r);if(r instanceof es)return new $w(r);if(r instanceof Oi)return new Qw(r);if(r instanceof V){if(r.name==="add")return new Xw(r);if(r.name==="subtract")return new Zw(r);if(r.name==="multiply")return new eT(r);if(r.name==="divide")return new tT(r);if(r.name==="mod")return new nT(r);if(r.name==="and")return new rT(r);if(r.name==="equal")return new CT(r);if(r.name==="not_equal")return new pT(r);if(r.name==="less_than")return new gT(r);if(r.name==="less_than_or_equal")return new mT(r);if(r.name==="greater_than")return new ET(r);if(r.name==="greater_than_or_equal")return new _T(r);if(r.name==="array_concat")return new DT(r);if(r.name==="array_reverse")return new IT(r);if(r.name==="array_contains")return new yT(r);if(r.name==="array_contains_all")return new wT(r);if(r.name==="array_contains_any")return new TT(r);if(r.name==="array_length")return new AT(r);if(r.name==="array_element")return new vT(r);if(r.name==="equal_any")return new em(r);if(r.name==="not_equal_any")return new iT(r);if(r.name==="is_nan")return new oT(r);if(r.name==="is_not_nan")return new aT(r);if(r.name==="is_null")return new uT(r);if(r.name==="is_not_null")return new cT(r);if(r.name==="is_error")return new BT(r);if(r.name==="exists")return new lT(r);if(r.name==="not")return new Ru(r);if(r.name==="or")return new sT(r);if(r.name==="xor")return new fl(r);if(r.name==="conditional")return new hT(r);if(r.name==="maximum")return new dT(r);if(r.name==="minimum")return new fT(r);if(r.name==="reverse")return new RT(r);if(r.name==="replace_first")return new bT(r);if(r.name==="replace_all")return new PT(r);if(r.name==="char_length")return new ST(r);if(r.name==="byte_length")return new OT(r);if(r.name==="like")return new NT(r);if(r.name==="regex_contains")return new FT(r);if(r.name==="regex_match")return new LT(r);if(r.name==="string_contains")return new xT(r);if(r.name==="starts_with")return new VT(r);if(r.name==="ends_with")return new kT(r);if(r.name==="to_lower")return new MT(r);if(r.name==="to_upper")return new GT(r);if(r.name==="trim")return new UT(r);if(r.name==="string_concat")return new HT(r);if(r.name==="map_get")return new jT(r);if(r.name==="cosine_distance")return new qT(r);if(r.name==="dot_product")return new JT(r);if(r.name==="euclidean_distance")return new KT(r);if(r.name==="vector_length")return new zT(r);if(r.name==="unix_micros_to_timestamp")return new XT(r);if(r.name==="timestamp_to_unix_micros")return new tA(r);if(r.name==="unix_millis_to_timestamp")return new ZT(r);if(r.name==="timestamp_to_unix_millis")return new nA(r);if(r.name==="unix_seconds_to_timestamp")return new eA(r);if(r.name==="timestamp_to_unix_seconds")return new rA(r);if(r.name==="timestamp_add")return new sA(r);if(r.name==="timestamp_subtract")return new iA(r)}throw new Error(`Unknown Expr : ${r}`)}class zw{constructor(e){this.expr=e}evaluate(e,t){if(this.expr.fieldName===Jt)return T.newValue({referenceValue:so(e.serializer,t.key)});if(this.expr.fieldName==="__update_time__")return T.newValue({timestampValue:_a(e.serializer,t.version)});if(this.expr.fieldName==="__create_time__")return T.newValue({timestampValue:_a(e.serializer,t.createTime)});const n=t.data.field(this.expr._fieldPath);return n?fu(n)?T.newValue(function(i,o){if(i.serverTimestampBehavior==="estimate")return{timestampValue:_a(i.serializer,X.fromTimestamp(vs(o)))};if(i.serverTimestampBehavior==="previous"){const a=To(o);if(a)return a}return{nullValue:"NULL_VALUE"}}(e,n)):T.newValue(n):T.mr()}}class $w{constructor(e){this.expr=e}evaluate(e,t){return T.newValue(this.expr._getValue())}}class Qw{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.ur.map(s=>ne(s).evaluate(e,t));return n.some(s=>s.gr())?T.dr():T.newValue({arrayValue:{values:n.map(s=>s.value)}})}}function Qe(r){return Sr(r)?Number(r.doubleValue):Number(r.integerValue)}function rn(r){return BigInt(r.integerValue)}const Ww=BigInt("0x7fffffffffffffff"),Yw=-BigInt("0x8000000000000000");class No{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length>=2,24778);const n=ne(this.expr.params[0]).evaluate(e,t),s=ne(this.expr.params[1]).evaluate(e,t);let i=this.wr(n,s);for(const o of this.expr.params.slice(2)){const a=ne(o).evaluate(e,t);i=this.wr(i,a)}return i}wr(e,t){if(e.gr()||t.gr())return T.dr();if(e.yr()||t.yr())return T.pr();const n=e.value,s=t.value;if(!Sr(n)&&!Kt(n)||!Sr(s)&&!Kt(s))return T.dr();if(Sr(n)||Sr(s)){const i=this.br(n,s);return i?T.newValue(i):T.dr()}if(Kt(n)&&Kt(s)){const i=this.Sr(n,s);return i===void 0?T.dr():typeof i=="number"?T.newValue({doubleValue:i}):i<Yw||i>Ww?T.dr():T.newValue({integerValue:`${i}`})}return T.dr()}}function mn(r,e){return Fe(r)!==Fe(e)?"TYPE_MISMATCH":ft(r)||ft(e)?"NOT_EQ":Dt(r)&&Dt(e)?"EQ":Dt(r)||Dt(e)?"NULL":er(r)&&er(e)?function(n,s){if(n.values?.length!==s.values?.length)return"NOT_EQ";let i=!1;for(let o=0;o<(n.values?.length??0);o++){const a=n.values[o],c=s.values[o];switch(mn(a,c)){case"EQ":break;case"NOT_EQ":case"TYPE_MISMATCH":return"NOT_EQ";case"NULL":i=!0;break;default:$(44609,{vr:a,Dr:c})}}return i?"NULL":"EQ"}(r.arrayValue,e.arrayValue):qr(r)&&qr(e)||Lr(r)&&Lr(e)?function(n,s){const i=n.fields||{},o=s.fields||{};if(Na(i)!==Na(o))return"NOT_EQ";let a=!1;for(const c in i)if(i.hasOwnProperty(c)){if(o[c]===void 0)return"NOT_EQ";switch(mn(i[c],o[c])){case"NOT_EQ":case"TYPE_MISMATCH":return"NOT_EQ";case"NULL":a=!0}}return a?"NULL":"EQ"}(r.mapValue,e.mapValue):function(n,s){return Ft(n,s,{o:!1,t:!0,i:!0})}(r,e)?"EQ":"NOT_EQ"}class Xw extends No{Sr(e,t){return rn(e)+rn(t)}br(e,t){return{doubleValue:Qe(e)+Qe(t)}}}class Zw extends No{constructor(e){super(e),this.expr=e}Sr(e,t){return rn(e)-rn(t)}br(e,t){return{doubleValue:Qe(e)-Qe(t)}}}class eT extends No{constructor(e){super(e),this.expr=e}Sr(e,t){return rn(e)*rn(t)}br(e,t){return{doubleValue:Qe(e)*Qe(t)}}}class tT extends No{constructor(e){super(e),this.expr=e}Sr(e,t){const n=rn(t);if(n!==BigInt(0))return rn(e)/n}br(e,t){const n=Qe(t);return n===0?{doubleValue:Rs(n)?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY}:{doubleValue:Qe(e)/n}}}class nT extends No{constructor(e){super(e),this.expr=e}Sr(e,t){const n=rn(t);if(n!==BigInt(0))return rn(e)%n}br(e,t){const n=Qe(t);if(n!==0)return{doubleValue:Qe(e)%n}}}class rT{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=ne(i).evaluate(e,t);switch(o.type){case"BOOLEAN":if(!o.value?.booleanValue)return T.newValue(Je);break;case"NULL":s=!0;break;default:n=!0}}return n?T.dr():s?T.pr():T.newValue(dt)}}class Ru{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,9634);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BOOLEAN":return T.newValue({booleanValue:!n.value?.booleanValue});case"NULL":return T.pr();default:return T.dr()}}}class sT{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=ne(i).evaluate(e,t);switch(o.type){case"BOOLEAN":if(o.value?.booleanValue)return T.newValue(dt);break;case"NULL":s=!0;break;default:n=!0}}return n?T.dr():s?T.pr():T.newValue(Je)}}class fl{constructor(e){this.expr=e}evaluate(e,t){let n=!1,s=!1;for(const i of this.expr.params){const o=ne(i).evaluate(e,t);switch(o.type){case"BOOLEAN":n=fl.xor(n,!!o.value?.booleanValue);break;case"NULL":s=!0;break;default:return T.dr()}}return s?T.pr():T.newValue({booleanValue:n})}static xor(e,t){return(e||t)&&!(e&&t)}}class em{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,55094);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"NULL":n=!0;break;case"ERROR":case"UNSET":return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return T.dr()}if(n)return T.pr();for(const o of i.value?.arrayValue?.values??[])switch(Dt(s.value)&&Dt(o)?"EQ":mn(s.value,o)){case"EQ":return T.newValue(dt);case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:$(44608,{value:s.value,candidate:o})}return n?T.pr():T.newValue(Je)}}class iT{constructor(e){this.expr=e}evaluate(e,t){return new Ru(new V("not",[new V("equal_any",this.expr.params)])).evaluate(e,t)}}class oT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,23322);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"INT":return T.newValue(Je);case"DOUBLE":return T.newValue({booleanValue:isNaN(Qe(n.value))});case"NULL":return T.pr();default:return T.dr()}}}class aT{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,50406),new Ru(new V("not",[new V("is_nan",this.expr.params)])).evaluate(e,t)}}class uT{constructor(e){this.expr=e}evaluate(e,t){switch(H(this.expr.params.length===1,23123),ne(this.expr.params[0]).evaluate(e,t).type){case"NULL":return T.newValue(dt);case"UNSET":case"ERROR":return T.dr();default:return T.newValue(Je)}}}class cT{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,23167),new Ru(new V("not",[new V("is_null",this.expr.params)])).evaluate(e,t)}}class BT{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===1,5228),ne(this.expr.params[0]).evaluate(e,t).type==="ERROR"?T.newValue(dt):T.newValue(Je)}}class lT{constructor(e){this.expr=e}evaluate(e,t){switch(H(this.expr.params.length===1,6877),ne(this.expr.params[0]).evaluate(e,t).type){case"ERROR":return T.dr();case"UNSET":return T.newValue(Je);default:return T.newValue(dt)}}}class hT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===3,11706);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BOOLEAN":return n.value?.booleanValue?ne(this.expr.params[1]).evaluate(e,t):ne(this.expr.params[2]).evaluate(e,t);case"NULL":return ne(this.expr.params[2]).evaluate(e,t);default:return T.dr()}}}class dT{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map(i=>ne(i).evaluate(e,t));let s;for(const i of n)switch(i.type){case"ERROR":case"UNSET":case"NULL":continue;default:s=s===void 0||tt(i.value,s.value)>0?i:s}return s===void 0?T.pr():s}}class fT{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map(i=>ne(i).evaluate(e,t));let s;for(const i of n)switch(i.type){case"ERROR":case"UNSET":case"NULL":continue;default:s=s===void 0||tt(i.value,s.value)<0?i:s}return s===void 0?T.pr():s}}class Ys{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,31033,`${this.expr.name}() function should have exactly 2 params`);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"ERROR":case"UNSET":return T.dr()}const s=ne(this.expr.params[1]).evaluate(e,t);switch(s.type){case"ERROR":case"UNSET":return T.dr()}return this.Cr(n,s)}}class CT extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){if(e.yr()&&t.yr())return T.newValue(dt);if(e.yr()||t.yr()||ft(e.value)||ft(t.value)||Fe(e.value)!==Fe(t.value))return T.newValue(Je);switch(mn(e.value,t.value)){case"EQ":return T.newValue(dt);case"NOT_EQ":return T.newValue(Je);case"NULL":return T.pr();default:$(44615,{left:e,right:t})}}}class pT extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){switch(mn(e.value,t.value)){case"EQ":return T.newValue(Je);case"NOT_EQ":case"TYPE_MISMATCH":return T.newValue(dt);case"NULL":return T.pr();default:$(44614,{left:e,right:t})}}}class gT extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){return Fe(e.value)!==Fe(t.value)||ft(e.value)||ft(t.value)?T.newValue(Je):T.newValue({booleanValue:tt(e.value,t.value)<0})}}class mT extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){return Fe(e.value)!==Fe(t.value)||ft(e.value)||ft(t.value)?T.newValue(Je):mn(e.value,t.value)==="EQ"?T.newValue(dt):T.newValue({booleanValue:tt(e.value,t.value)<0})}}class ET extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){return Fe(e.value)!==Fe(t.value)||ft(e.value)||ft(t.value)?T.newValue(Je):T.newValue({booleanValue:tt(e.value,t.value)>0})}}class _T extends Ys{constructor(e){super(e),this.expr=e}Cr(e,t){return Fe(e.value)!==Fe(t.value)||ft(e.value)||ft(t.value)?T.newValue(Je):mn(e.value,t.value)==="EQ"?T.newValue(dt):T.newValue({booleanValue:tt(e.value,t.value)>0})}}class DT{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class IT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,216);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return T.pr();case"ARRAY":{const s=n.value.arrayValue?.values??[];return T.newValue({arrayValue:{values:[...s].reverse()}})}default:return T.dr()}}}class yT{constructor(e){this.expr=e}evaluate(e,t){return H(this.expr.params.length===2,52884),new em(new V("eq_any",[this.expr.params[1],this.expr.params[0]])).evaluate(e,t)}}class wT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,1392);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"ARRAY":break;case"NULL":n=!0;break;default:return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return T.dr()}if(n)return T.pr();const o=i.value?.arrayValue?.values??[],a=s.value?.arrayValue?.values??[];for(const c of o){let B=!1;n=!1;for(const h of a){switch(Dt(c)&&Dt(h)?"EQ":mn(c,h)){case"EQ":B=!0;break;case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:$(44613,{value:h,search:c})}if(B)break}if(!B)return T.newValue(Je)}return T.newValue(dt)}}class TT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,2680);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"ARRAY":break;case"NULL":n=!0;break;default:return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);switch(i.type){case"ARRAY":break;case"NULL":n=!0;break;default:return T.dr()}if(n)return T.pr();const o=i.value?.arrayValue?.values??[],a=s.value?.arrayValue?.values??[];for(const c of a)for(const B of o)switch(Dt(c)&&Dt(B)?"EQ":mn(c,B)){case"EQ":return T.newValue(dt);case"NOT_EQ":case"TYPE_MISMATCH":break;case"NULL":n=!0;break;default:$(60403,{value:c,search:B})}return n?T.pr():T.newValue(Je)}}class AT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,38605);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return T.pr();case"ARRAY":return T.newValue({integerValue:`${n.value?.arrayValue?.values?.length??0}`});default:return T.dr()}}}class vT{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class RT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,1508);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return T.pr();case"BYTES":{const s=n.value?.bytesValue;if(typeof s=="string"){const i=Ae.fromBase64String(s).toUint8Array();return i.reverse(),T.newValue({bytesValue:Ae.fromUint8Array(i).toBase64()})}return T.newValue({bytesValue:new Uint8Array(s).reverse()})}case"STRING":{const s=n.value?.stringValue,i=new Intl.__PRIVATE_Segmenter(void 0,{granularity:"grapheme"}).segment(s),o=Array.from(i,a=>a.segment).reverse();return T.newValue({stringValue:o.join("")})}default:return T.dr()}}}class bT{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class PT{constructor(e){this.expr=e}evaluate(e,t){throw new Error("Unimplemented")}}class ST{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,19400);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"NULL":return T.pr();case"STRING":{const s=function(o){let a=0;for(let c=0;c<o.length;c++){const B=o.codePointAt(c);if(B===void 0)return;if(B<=65535)if(B>=55296&&B<=57343)if(B<=56319){const h=o.codePointAt(c+1);h!==void 0&&h>=56320&&h<=57343?(a+=1,c++):a+=1}else a+=1;else a+=1;else{if(!(B<=1114111))return;a+=1,c++}}return a}(n.value.stringValue);return s===void 0?T.dr():T.newValue({integerValue:s})}default:return T.dr()}}}class OT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,8486);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"BYTES":{const s=n.value?.bytesValue;return typeof s=="string"?T.newValue({integerValue:Ae.fromBase64String(s).toUint8Array().length}):T.newValue({integerValue:new Uint8Array(s).length})}case"STRING":{const s=function(o){let a=0;for(let c=0;c<o.length;c++){const B=o.codePointAt(c);if(B===void 0)return;if(B>=55296&&B<=57343){if(!(B<=56319))return;{const h=o.codePointAt(c+1);if(h===void 0||!(h>=56320&&h<=57343))return;a+=4,c++}}else if(B<=127)a+=1;else if(B<=2047)a+=2;else if(B<=65535)a+=3;else{if(!(B<=1114111))return;a+=4,c++}}return a}(n.value?.stringValue);return s===void 0?T.dr():T.newValue({integerValue:s})}case"NULL":return T.pr();default:return T.dr()}}}class Xs{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,39773,`${this.expr.name}() function should have exactly two parameters`);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"STRING":break;case"NULL":n=!0;break;default:return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);switch(i.type){case"STRING":break;case"NULL":n=!0;break;default:return T.dr()}return n?T.pr():this.Fr(s.value?.stringValue,i.value?.stringValue)}}class NT extends Xs{Fr(e,t){try{const n=function(o){let a="";for(let c=0;c<o.length;c++){const B=o.charAt(c);switch(B){case"_":a+=".";break;case"%":a+=".*";break;case"\\":case".":case"*":case"?":case"+":case"^":case"$":case"|":case"(":case")":case"[":case"]":case"{":case"}":a+="\\"+B;break;default:a+=B}}return"^"+a+"$"}(t),s=HB.compile(n);return T.newValue({booleanValue:s.matches(e)})}catch(n){return Nt(`Invalid LIKE pattern converted to regex: ${t}, returning error. Error: ${n}`),T.dr()}}}class FT extends Xs{Fr(e,t){try{const n=HB.compile(t);return T.newValue({booleanValue:n.test(e)})}catch{return Nt(`Invalid regex pattern found in regex_contains: ${t}, returning error`),T.dr()}}}class LT extends Xs{Fr(e,t){try{return T.newValue({booleanValue:HB.compile(t).matches(e)})}catch{return Nt(`Invalid regex pattern found in regex_match: ${t}, returning error`),T.dr()}}}class xT extends Xs{Fr(e,t){return T.newValue({booleanValue:e.includes(t)})}}class VT extends Xs{Fr(e,t){return T.newValue({booleanValue:e.startsWith(t)})}}class kT extends Xs{Fr(e,t){return T.newValue({booleanValue:e.endsWith(t)})}}class MT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,29079);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return T.newValue({stringValue:n.value?.stringValue?.toLowerCase()});case"NULL":return T.pr();default:return T.dr()}}}class GT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,60487);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return T.newValue({stringValue:n.value?.stringValue?.toUpperCase()});case"NULL":return T.pr();default:return T.dr()}}}class UT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,28544);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"STRING":return T.newValue({stringValue:n.value?.stringValue?.trim()});case"NULL":return T.pr();default:return T.dr()}}}class HT{constructor(e){this.expr=e}evaluate(e,t){const n=this.expr.params.map(o=>ne(o).evaluate(e,t));let s="",i=!1;for(const o of n)switch(o.type){case"STRING":s+=o.value.stringValue;break;case"NULL":i=!0;break;default:return T.dr()}return i?T.pr():T.newValue({stringValue:s})}}class jT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,4483);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"UNSET":return T.mr();case"MAP":break;default:return T.dr()}const s=ne(this.expr.params[1]).evaluate(e,t);if(s.type!=="STRING")return T.dr();const i=n.value?.mapValue?.fields?.[s.value?.stringValue];return i===void 0?T.mr():T.newValue(i)}}class Cl{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===2,25231,`${this.expr.name}() function should have exactly 2 params`);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"VECTOR":break;case"NULL":n=!0;break;default:return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);switch(i.type){case"VECTOR":break;case"NULL":n=!0;break;default:return T.dr()}if(n)return T.pr();const o=nB(s.value),a=nB(i.value);if(o===void 0||a===void 0||o.values?.length!==a.values?.length)return T.dr();const c=this.Or(o,a);return c===void 0||isNaN(c)?T.dr():T.newValue({doubleValue:c})}}class qT extends Cl{Or(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return;let i=0,o=0,a=0;for(let B=0;B<n.length;B++){if(!Zn(n[B])||!Zn(s[B]))return;const h=Qe(n[B]),d=Qe(s[B]);i+=h*d,o+=h*h,a+=d*d}const c=Math.sqrt(o)*Math.sqrt(a);if(c!==0)return 1-Math.max(-1,Math.min(1,i/c))}}class JT extends Cl{Or(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return 0;let i=0;for(let o=0;o<n.length;o++){if(!Zn(n[o])||!Zn(s[o]))return;i+=Qe(n[o])*Qe(s[o])}return i}}class KT extends Cl{Or(e,t){const n=e?.values??[],s=t?.values??[];if(n.length===0)return 0;let i=0;for(let o=0;o<n.length;o++){if(!Zn(n[o])||!Zn(s[o]))return;const a=Qe(n[o]),c=Qe(s[o]);i+=Math.pow(a-c,2)}return Math.sqrt(i)}}class zT{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,39044);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"VECTOR":{const s=nB(n.value);return T.newValue({integerValue:s?.values?.length??0})}case"NULL":return T.pr();default:return T.dr()}}}const ao=BigInt(-62135596800),uo=BigInt(253402300799),Ha=BigInt(1e3),Wn=BigInt(1e6),$T=ao*Ha,QT=uo*Ha+BigInt(999),WT=ao*Wn,YT=uo*Wn+BigInt(999999);function pl(r){return r>=WT&&r<=YT}function tm(r){return r>=ao&&r<=uo}function co(r,e){const t=BigInt(r);return!(t<ao||t>uo)&&!(e<0||e>=1e9)&&(t!==ao||e===0)&&!(t===uo&&e>999999999)}function nm(r,e){return e<0?{seconds:r-1,nanos:e+1e9}:{seconds:r,nanos:e}}function gl(r){return BigInt(r.seconds)*Wn+BigInt(Math.trunc(r.nanoseconds/1e3))}class ml{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,49262,`${this.expr.name}() function should have exactly one parameter`);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"INT":return this.toTimestamp(BigInt(n.value.integerValue));case"NULL":return T.pr();default:return T.dr()}}}class XT extends ml{toTimestamp(e){if(!pl(e))return T.dr();let t=Number(e/Wn),n=Number(e%Wn*BigInt(1e3));const s=nm(t,n);return t=s.seconds,n=s.nanos,co(t,n)?T.newValue({timestampValue:{seconds:t,nanos:n}}):T.dr()}}class ZT extends ml{toTimestamp(e){if(!function(o){return o>=$T&&o<=QT}(e))return T.dr();let t=Number(e/Ha),n=Number(e%Ha*BigInt(1e6));const s=nm(t,n);return t=s.seconds,n=s.nanos,co(t,n)?T.newValue({timestampValue:{seconds:t,nanos:n}}):T.dr()}}class eA extends ml{toTimestamp(e){if(!tm(e))return T.dr();const t=Number(e);return T.newValue({timestampValue:{seconds:t,nanos:0}})}}class El{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===1,1265,`${this.expr.name}() function should have exactly one parameter`);const n=ne(this.expr.params[0]).evaluate(e,t);switch(n.type){case"TIMESTAMP":break;case"NULL":return T.pr();default:return T.dr()}const s=rl(n.value.timestampValue);return co(s.seconds,s.nanoseconds)?this.Mr(s):T.dr()}}class tA extends El{Mr(e){const t=gl(e);return pl(t)?T.newValue({integerValue:`${t.toString()}`}):T.dr()}}class nA extends El{Mr(e){const t=gl(e),n=t/BigInt(1e3),s=t%BigInt(1e3);return n>BigInt(0)||s===BigInt(0)?T.newValue({integerValue:n.toString()}):T.newValue({integerValue:(n-BigInt(1)).toString()})}}class rA extends El{Mr(e){const t=BigInt(e.seconds);return tm(t)?T.newValue({integerValue:t.toString()}):T.dr()}}class rm{constructor(e){this.expr=e}evaluate(e,t){H(this.expr.params.length===3,2775,`${this.expr.name}() function should have exactly 3 parameters`);let n=!1;const s=ne(this.expr.params[0]).evaluate(e,t);switch(s.type){case"TIMESTAMP":break;case"NULL":n=!0;break;default:return T.dr()}const i=ne(this.expr.params[1]).evaluate(e,t);let o;switch(i.type){case"STRING":if(o=function(Z){switch(Z){case"microsecond":return"microsecond";case"millisecond":return"millisecond";case"second":return"second";case"minute":return"minute";case"hour":return"hour";case"day":return"day";default:return}}(i.value.stringValue),o===void 0)return T.dr();break;case"NULL":n=!0;break;default:return T.dr()}const a=ne(this.expr.params[2]).evaluate(e,t);switch(a.type){case"INT":break;case"NULL":n=!0;break;default:return T.dr()}if(n)return T.pr();const c=BigInt(a.value.integerValue);let B;try{switch(o){case"microsecond":B=c;break;case"millisecond":B=c*BigInt(1e3);break;case"second":B=c*BigInt(1e6);break;case"minute":B=c*BigInt(6e7);break;case"hour":B=c*BigInt(36e8);break;case"day":B=c*BigInt(864e8);break;default:return T.dr()}if(o!=="microsecond"&&c!==BigInt(0)&&B/c!==BigInt(this.Nr(o)))return T.dr()}catch(K){return Nt(`Error during timestamp arithmetic: ${K}`),T.dr()}const h=rl(s.value.timestampValue);if(!co(h.seconds,h.nanoseconds))return T.dr();const d=gl(h),C=this.Lr(d,B);if(!pl(C))return T.dr();const I=Number(C/Wn),R=C%Wn,N=Number((R<0?R+Wn:R)*BigInt(1e3)),M=R<0?I-1:I;return co(M,N)?T.newValue({timestampValue:{seconds:M,nanos:N}}):T.dr()}Nr(e){switch(e){case"millisecond":return 1e3;case"second":return 1e6;case"minute":return 6e7;case"hour":return 36e8;case"day":return 864e8;default:return 1}}}class sA extends rm{Lr(e,t){return e+t}}class iA extends rm{Lr(e,t){return e-t}}function Bo(r){if((r=Zg(r))instanceof Zr)return`fld(${r.fieldName})`;if(r instanceof es)return`cst(${function(t){return t===null?"null":typeof t=="number"?t.toString():typeof t=="string"?`"${t}"`:t instanceof ve?`ref(${t.path})`:t instanceof ht?`vec(${JSON.stringify(t)})`:JSON.stringify(t)}(r.value)})`;if(r instanceof V)return`fn(${r.name},[${r.params.map(Bo).join(",")}])`;if(r.expressionType==="ListOfExpressions")return`list([${r.ur.map(Bo).join(",")}])`;throw new Error(`Unrecognized expr ${JSON.stringify(r,null,2)}`)}function oA(r){if(r instanceof Qg)return`${r._name}(${ca(r.fields)})`;if(r instanceof Wg){let e=`${r._name}(${ca(r.accumulators)})`;return r.groups.size>0&&(e+=`grouping(${ca(r.groups)})`),e}if(r instanceof Yg)return`${r._name}(${ca(r.groups)})`;if(r instanceof bo)return`${r._name}(${r.Er})`;if(r instanceof Po)return`${r._name}(${r.collectionId})`;if(r instanceof Au)return`${r._name}()`;if(r instanceof vu)return`${r._name}(${r.hr.sort()})`;if(r instanceof So)return`${r._name}(${Bo(r.condition)})`;if(r instanceof sr)return`${r._name}(${r.limit})`;if(r instanceof zt)return`${r._name}(${function(t){return t.map(n=>`${Bo(n.expr)}${n.direction}`).join(",")}(r.orderings)})`;throw new Error(`Unrecognized stage ${r._name}`)}function ca(r){return`${Array.from(r.entries()).sort().map(([e,t])=>`${e}=${Bo(t)}`).join(",")}`}function dn(r){return r.stages.map(e=>oA(e)).join("|")}function sm(r,e){return dn(r)===dn(e)}function Pe(r){return r instanceof Ze}function Gf(r){return Pe(r)?dn(r):Mi(r)}function im(r){return Pe(r)?dn(r):function(t){return`${Va(yt(t))}|lt:${t.limitType}`}(r)}function bu(r,e){return r instanceof Ze&&e instanceof Ze?sm(r,e):!(r instanceof Ze&&!(e instanceof Ze)||!(r instanceof Ze)&&e instanceof Ze)&&Ly(r,e)}function Pu(r){return un(r)?dn(r):Va(r)}function _l(r,e){return r instanceof Ze&&e instanceof Ze?sm(r,e):!(r instanceof Ze&&!(e instanceof Ze)||!(r instanceof Ze)&&e instanceof Ze)&&XB(r,e)}function aA(r,e){const t=function(s){let i=!1;const o=[];for(const a of s)if(a instanceof zt)if(i=!0,a.orderings.some(c=>c.expr instanceof Zr&&c.expr.fieldName===Jt))o.push(a);else{const c=a.orderings.map(B=>B);c.push(Da(Jt).ascending()),o.push(new zt(c,{}))}else a instanceof sr&&(i||(o.push(new zt([Da(Jt).ascending()],{})),i=!0)),o.push(a);return i||o.push(new zt([Da(Jt).ascending()],{})),o}(r.stages);if(r.userDataReader){const n=r.userDataReader.createContext(3,"toCorePipeline");t.forEach(s=>s._readUserData(n))}return new Ze(r.userDataReader.serializer,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dl{constructor(e,t,n,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=s}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const i=this.mutations[s];i.key.isEqual(e.key)&&yy(i,e,n[s])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=Vi(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=Vi(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=Bg();return this.mutations.forEach(s=>{const i=e.get(s.key),o=i.overlayedDocument;let a=this.applyToLocalView(o,i.mutatedFields);a=t.has(s.key)?null:a;const c=zp(o,a);c!==null&&n.set(s.key,c),o.isValidDocument()||o.convertToNoDocument(X.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),ie())}isEqual(e){return this.batchId===e.batchId&&As(this.mutations,e.mutations,(t,n)=>Cf(t,n))&&As(this.baseMutations,e.baseMutations,(t,n)=>Cf(t,n))}}class Il{constructor(e,t,n,s){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=s}static from(e,t,n){H(e.mutations.length===n.length,58842,{Br:e.mutations.length,Ur:n.length});let s=function(){return Gy}();const i=e.mutations;for(let o=0;o<i.length;o++)s=s.insert(i[o].key,n[o].version);return new Il(e,t,n,s)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ja="";function et(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=Uf(e)),e=uA(r.get(t),e);return Uf(e)}function uA(r,e){let t=e;const n=r.length;for(let s=0;s<n;s++){const i=r.charAt(s);switch(i){case"\0":t+="";break;case ja:t+="";break;default:t+=i}}return t}function Uf(r){return r+ja+""}function $t(r){const e=r.length;if(H(e>=2,64408,{path:r}),e===2)return H(r.charAt(0)===ja&&r.charAt(1)==="",56145,{path:r}),ue.emptyPath();const t=e-2,n=[];let s="";for(let i=0;i<e;){const o=r.indexOf(ja,i);switch((o<0||o>t)&&$(50515,{path:r}),r.charAt(o+1)){case"":const a=r.substring(i,o);let c;s.length===0?c=a:(s+=a,c=s,s=""),n.push(c);break;case"":s+=r.substring(i,o),s+="\0";break;case"":s+=r.substring(i,o+1);break;default:$(61167,{path:r})}i=o+2}return new ue(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wr="remoteDocuments",Fo="owner",as="owner",lo="mutationQueues",cA="userId",Lt="mutations",Hf="batchId",Or="userMutationsIndex",jf=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ia(r,e){return[r,et(e)]}function om(r,e,t){return[r,et(e),t]}const BA={},Vs="documentMutations",qa="remoteDocumentsV14",lA=["prefixPath","collectionGroup","readTime","documentId"],ya="documentKeyIndex",hA=["prefixPath","collectionGroup","documentId"],am="collectionGroupIndex",dA=["collectionGroup","readTime","prefixPath","documentId"],ho="remoteDocumentGlobal",fB="remoteDocumentGlobalKey",ks="targets",um="queryTargetsIndex",fA=["canonicalId","targetId"],Ms="targetDocuments",CA=["targetId","path"],yl="documentTargetsIndex",pA=["path","targetId"],Ja="targetGlobalKey",Vr="targetGlobal",fo="collectionParents",gA=["collectionId","parent"],Gs="clientMetadata",mA="clientId",Su="bundles",EA="bundleId",Ou="namedQueries",_A="name",wl="indexConfiguration",DA="indexId",CB="collectionGroupIndex",IA="collectionGroup",qi="indexState",yA=["indexId","uid"],cm="sequenceNumberIndex",wA=["uid","sequenceNumber"],Ji="indexEntries",TA=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Bm="documentKeyIndex",AA=["indexId","uid","orderedDocumentKey"],Nu="documentOverlays",vA=["userId","collectionPath","documentId"],pB="collectionPathOverlayIndex",RA=["userId","collectionPath","largestBatchId"],lm="collectionGroupOverlayIndex",bA=["userId","collectionGroup","largestBatchId"],Tl="globals",PA="name",hm=[lo,Lt,Vs,wr,ks,Fo,Vr,Ms,Gs,ho,fo,Su,Ou],SA=[...hm,Nu],dm=[lo,Lt,Vs,qa,ks,Fo,Vr,Ms,Gs,ho,fo,Su,Ou,Nu],fm=dm,Al=[...fm,wl,qi,Ji],OA=Al,Cm=[...Al,Tl],NA=Cm;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pm(r,e,t){const n=r.store(Lt),s=r.store(Vs),i=[],o=IDBKeyRange.only(t.batchId);let a=0;const c=n.jn({range:o},(h,d,C)=>(a++,C.delete()));i.push(c.next(()=>{H(a===1,47070,{batchId:t.batchId})}));const B=[];for(const h of t.mutations){const d=om(e,h.key.path,t.batchId);i.push(s.delete(d)),B.push(h.key)}return b.waitFor(i).next(()=>B)}function Ka(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw $(14731);e=r.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gB extends Ng{constructor(e,t){super(),this.kr=e,this.currentSequenceNumber=t}}function Ge(r,e){const t=Q(r);return $n.xn(t.kr,e)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vl{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qt{constructor(e,t,n,s,i=X.min(),o=X.min(),a=Ae.EMPTY_BYTE_STRING,c=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=s,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=a,this.expectedCount=c}withSequenceNumber(e){return new Qt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gm{constructor(e){this.qr=e}}function FA(r,e){let t;if(e.document)t=Wy(r.qr,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=q.fromSegments(e.noDocument.path),s=Kr(e.noDocument.readTime);t=be.newNoDocument(n,s),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return $(56709);{const n=q.fromSegments(e.unknownDocument.path),s=Kr(e.unknownDocument.version);t=be.newUnknownDocument(n,s)}}return e.readTime&&t.setReadTime(function(s){const i=new ge(s[0],s[1]);return X.fromTimestamp(i)}(e.readTime)),t}function qf(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:za(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(i,o){return{name:so(i,o.key),fields:o.data.value.mapValue.fields,updateTime:xs(i,o.version.toTimestamp()),createTime:xs(i,o.createTime.toTimestamp())}}(r.qr,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:Jr(e.version)};else{if(!e.isUnknownDocument())return $(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:Jr(e.version)}}return n}function za(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function Jr(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Kr(r){const e=new ge(r.seconds,r.nanoseconds);return X.fromTimestamp(e)}function vr(r,e){const t=(e.baseMutations||[]).map(i=>hB(r.qr,i));for(let i=0;i<e.mutations.length-1;++i){const o=e.mutations[i];if(i+1<e.mutations.length&&e.mutations[i+1].transform!==void 0){const a=e.mutations[i+1];o.updateTransforms=a.transform.fieldTransforms,e.mutations.splice(i+1,1),++i}}const n=e.mutations.map(i=>hB(r.qr,i)),s=ge.fromMillis(e.localWriteTimeMs);return new Dl(e.batchId,s,t,n)}function Ni(r,e){const t=Kr(e.readTime),n=e.lastLimboFreeSnapshotVersion!==void 0?Kr(e.lastLimboFreeSnapshotVersion):X.min();let s;return s=function(o){return o.structuredPipeline!==void 0}(e.query)?function(o,a){const c=o.structuredPipeline;H((c?.pipeline?.stages??[]).length>0,1845);const B=c?.pipeline?.stages.map(LA);return new Ze(a,B)}(e.query,r.qr):function(o){return o.documents!==void 0}(e.query)?function(o){const a=o.documents.length;return H(a===1,1966,{count:a}),yt(vo(pg(o.documents[0])))}(e.query):function(o){return yt(_g(o))}(e.query),new Qt(s,e.targetId,"TargetPurposeListen",e.lastListenSequenceNumber,t,n,Ae.fromBase64String(e.resumeToken))}function mm(r,e){const t=Jr(e.snapshotVersion),n=Jr(e.lastLimboFreeSnapshotVersion);let s;s=un(e.target)?Dg(r.qr,e.target):ZB(e.target)?mg(r.qr,e.target):Eg(r.qr,e.target).be;const i=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:Pu(e.target),readTime:t,resumeToken:i,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:s}}function Em(r){const e=_g({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?uB(e,e.limit,"L"):e}function Ba(r,e){return new vl(e.largestBatchId,hB(r.qr,e.overlayMutation))}function Jf(r,e){const t=e.path.lastSegment();return[r,et(e.path.popLast()),t]}function Kf(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:Jr(n.readTime),documentKey:et(n.documentKey.path),largestBatchId:n.largestBatchId}}function LA(r){switch(r.name){case"collection":return new bo(r.args[0].referenceValue,{});case"collection_group":return new Po(r.args[1].stringValue,{});case"database":return new Au({});case"documents":return new vu(r.args.map(e=>e.referenceValue),{});case"where":return new So(mB(r.args[0]),{});case"limit":{const e=r.args[0].integerValue??r.args[0].doubleValue;return new sr(typeof e=="number"?e:Number(e),{})}case"sort":return new zt(r.args.map(e=>function(n){const s=n.mapValue?.fields;return new ll(mB(s.expression),s.direction?.stringValue,"orderingFromProto")}(e)),{});default:throw new Error(`Stage type: ${r.name} not supported.`)}}function mB(r){return r.fieldReferenceValue?new Zr(nr("_exprFromProto",r.fieldReferenceValue),"_exprFromProto"):r.functionValue?function(t){return new V(t.functionValue.name,t.functionValue.args?.map(mB)||[])}(r):es._fromProto(r)}class Fu{constructor(e,t,n,s){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=s,this.$r={}}static Kr(e,t,n,s){H(e.uid!=="",64387);const i=e.isAuthenticated()?e.uid:"";return new Fu(i,t,n,s)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return On(e).jn({index:Or,range:n},(s,i,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,s){const i=Es(e),o=On(e);return o.add({}).next(a=>{H(typeof a=="number",49019);const c=new Dl(a,t,n,s),B=function(I,R,N){const M=N.baseMutations.map(Z=>Ma(I.qr,Z)),K=N.mutations.map(Z=>Ma(I.qr,Z));return{userId:R,batchId:N.batchId,localWriteTimeMs:N.localWriteTime.toMillis(),baseMutations:M,mutations:K}}(this.serializer,this.userId,c),h=[];let d=new pe((C,I)=>se(C.canonicalString(),I.canonicalString()));for(const C of s){const I=om(this.userId,C.key.path,a);d=d.add(C.key.path.popLast()),h.push(o.put(B)),h.push(i.put(I,BA))}return d.forEach(C=>{h.push(this.indexManager.addToCollectionParentIndex(e,C))}),e.addOnCommittedListener(()=>{this.$r[a]=c.keys()}),b.waitFor(h).next(()=>c)})}lookupMutationBatch(e,t){return On(e).get(t).next(n=>n?(H(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),vr(this.serializer,n)):null)}Qr(e,t){return this.$r[t]?b.resolve(this.$r[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const s=n.keys();return this.$r[t]=s,s}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=IDBKeyRange.lowerBound([this.userId,n]);let i=null;return On(e).jn({index:Or,range:s},(o,a,c)=>{a.userId===this.userId&&(H(a.batchId>=n,47524,{Wr:n}),i=vr(this.serializer,a)),c.done()}).next(()=>i)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=Fr;return On(e).jn({index:Or,range:t,reverse:!0},(s,i,o)=>{n=i.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Fr],[this.userId,Number.POSITIVE_INFINITY]);return On(e).Kn(Or,t).next(n=>n.map(s=>vr(this.serializer,s)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=Ia(this.userId,t.path),s=IDBKeyRange.lowerBound(n),i=[];return Es(e).jn({range:s},(o,a,c)=>{const[B,h,d]=o,C=$t(h);if(B===this.userId&&t.path.isEqual(C))return On(e).get(d).next(I=>{if(!I)throw $(61480,{Gr:o,batchId:d});H(I.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:I.userId,batchId:d}),i.push(vr(this.serializer,I))});c.done()}).next(()=>i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new pe(se);const s=[];return t.forEach(i=>{const o=Ia(this.userId,i.path),a=IDBKeyRange.lowerBound(o),c=Es(e).jn({range:a},(B,h,d)=>{const[C,I,R]=B,N=$t(I);C===this.userId&&i.path.isEqual(N)?n=n.add(R):d.done()});s.push(c)}),b.waitFor(s).next(()=>this.zr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1,i=Ia(this.userId,n),o=IDBKeyRange.lowerBound(i);let a=new pe(se);return Es(e).jn({range:o},(c,B,h)=>{const[d,C,I]=c,R=$t(C);d===this.userId&&n.isPrefixOf(R)?R.length===s&&(a=a.add(I)):h.done()}).next(()=>this.zr(e,a))}zr(e,t){const n=[],s=[];return t.forEach(i=>{s.push(On(e).get(i).next(o=>{if(o===null)throw $(35274,{batchId:i});H(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:i}),n.push(vr(this.serializer,o))}))}),b.waitFor(s).next(()=>n)}removeMutationBatch(e,t){return pm(e.kr,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.jr(t.batchId)}),b.forEach(n,s=>this.referenceDelegate.markPotentiallyOrphaned(e,s))))}jr(e){delete this.$r[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return b.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),s=[];return Es(e).jn({range:n},(i,o,a)=>{if(i[0]===this.userId){const c=$t(i[1]);s.push(c)}else a.done()}).next(()=>{H(s.length===0,56720,{Hr:s.map(i=>i.canonicalString())})})})}containsKey(e,t){return _m(e,this.userId,t)}Jr(e){return Dm(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:Fr,lastStreamToken:""})}}function _m(r,e,t){const n=Ia(e,t.path),s=n[1],i=IDBKeyRange.lowerBound(n);let o=!1;return Es(r).jn({range:i,zn:!0},(a,c,B)=>{const[h,d,C]=a;h===e&&d===s&&(o=!0),B.done()}).next(()=>o)}function On(r){return Ge(r,Lt)}function Es(r){return Ge(r,Vs)}function Dm(r){return Ge(r,lo)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xA{getBundleMetadata(e,t){return zf(e).get(t).next(n=>{if(n)return function(i){return{id:i.bundleId,createTime:Kr(i.createTime),version:i.version}}(n)})}saveBundleMetadata(e,t){return zf(e).put(function(s){return{bundleId:s.id,createTime:Jr(at(s.createTime)),version:s.version}}(t))}getNamedQuery(e,t){return $f(e).get(t).next(n=>{if(n)return function(i){return{name:i.name,query:Em(i.bundledQuery),readTime:Kr(i.readTime)}}(n)})}saveNamedQuery(e,t){return $f(e).put(function(s){return{name:s.name,readTime:Jr(at(s.readTime)),bundledQuery:s.bundledQuery}}(t))}}function zf(r){return Ge(r,Su)}function $f(r){return Ge(r,Ou)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lu{constructor(e,t){this.serializer=e,this.userId=t}static Kr(e,t){const n=t.uid||"";return new Lu(e,n)}getOverlay(e,t){return us(e).get(Jf(this.userId,t)).next(n=>n?Ba(this.serializer,n):null)}getOverlays(e,t){const n=Pt();return b.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}getAllOverlays(e,t){const n=Pt();return us(e).jn((s,i)=>{const o=Ba(this.serializer,i);o.largestBatchId>t&&n.set(o.getKey(),o)}).next(()=>n)}saveOverlays(e,t,n){const s=[];return n.forEach((i,o)=>{const a=new vl(t,o);s.push(this.Yr(e,a))}),b.waitFor(s)}removeOverlaysForBatchId(e,t,n){const s=new Set;t.forEach(o=>s.add(et(o.getCollectionPath())));const i=[];return s.forEach(o=>{const a=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);i.push(us(e).Gn(pB,a))}),b.waitFor(i)}getOverlaysForCollection(e,t,n){const s=Pt(),i=et(t),o=IDBKeyRange.bound([this.userId,i,n],[this.userId,i,Number.POSITIVE_INFINITY],!0);return us(e).Kn(pB,o).next(a=>{for(const c of a){const B=Ba(this.serializer,c);s.set(B.getKey(),B)}return s})}getOverlaysForCollectionGroup(e,t,n,s){const i=Pt();let o;const a=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return us(e).jn({index:lm,range:a},(c,B,h)=>{const d=Ba(this.serializer,B);i.size()<s||d.largestBatchId===o?(i.set(d.getKey(),d),o=d.largestBatchId):h.done()}).next(()=>i)}Yr(e,t){return us(e).put(function(s,i,o){const[a,c,B]=Jf(i,o.mutation.key);return{userId:i,collectionPath:c,documentId:B,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Ma(s.qr,o.mutation)}}(this.serializer,this.userId,t))}}function us(r){return Ge(r,Nu)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class VA{Zr(e){return Ge(e,Tl)}getSessionToken(e){return this.Zr(e).get("sessionToken").next(t=>{const n=t?.value;return n?Ae.fromUint8Array(n):Ae.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.Zr(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rr{constructor(){}Xr(e,t){this.ei(e,t),t.ti()}ei(e,t){if("nullValue"in e)this.ni(t,5);else if("booleanValue"in e)this.ni(t,10),t.ri(e.booleanValue?1:0);else if("integerValue"in e)this.ni(t,15),t.ri(Ie(e.integerValue));else if("doubleValue"in e){const n=Ie(e.doubleValue);isNaN(n)?this.ni(t,13):(this.ni(t,15),Rs(n)?t.ri(0):t.ri(n))}else if("timestampValue"in e){let n=e.timestampValue;this.ni(t,20),typeof n=="string"&&(n=pn(n)),t.ii(`${n.seconds||""}`),t.ri(n.nanos||0)}else if("stringValue"in e)this.si(e.stringValue,t),this._i(t);else if("bytesValue"in e)this.ni(t,30),t.oi(gn(e.bytesValue)),this._i(t);else if("referenceValue"in e)this.ai(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.ni(t,45),t.ri(n.latitude||0),t.ri(n.longitude||0)}else"mapValue"in e?Gp(e)?this.ni(t,Number.MAX_SAFE_INTEGER):qr(e)?this.ui(e.mapValue,t):(this.ci(e.mapValue,t),this._i(t)):"arrayValue"in e?(this.li(e.arrayValue,t),this._i(t)):$(19022,{Ei:e})}si(e,t){this.ni(t,25),this.hi(e,t)}hi(e,t){t.ii(e)}ci(e,t){const n=e.fields||{};this.ni(t,55);for(const s of Object.keys(n))this.si(s,t),this.ei(n[s],t)}ui(e,t){const n=e.fields||{};this.ni(t,53);const s=jr,i=n[s].arrayValue?.values?.length||0;this.ni(t,15),t.ri(Ie(i)),this.si(s,t),this.ei(n[s],t)}li(e,t){const n=e.values||[];this.ni(t,50);for(const s of n)this.ei(s,t)}ai(e,t){this.ni(t,37),q.fromName(e).path.forEach(n=>{this.ni(t,60),this.hi(n,t)})}ni(e,t){e.ri(t)}_i(e){e.ri(2)}}Rr.Ti=new Rr;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cs=255;function kA(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Qf(r){const e=64-function(n){let s=0;for(let i=0;i<8;++i){const o=kA(255&n[i]);if(s+=o,o!==8)break}return s}(r);return Math.ceil(e/8)}class MA{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Pi(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ri(n.value),n=t.next();this.Ii()}Ai(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Vi(n.value),n=t.next();this.di()}fi(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Ri(n);else if(n<2048)this.Ri(960|n>>>6),this.Ri(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Ri(480|n>>>12),this.Ri(128|63&n>>>6),this.Ri(128|63&n);else{const s=t.codePointAt(0);this.Ri(240|s>>>18),this.Ri(128|63&s>>>12),this.Ri(128|63&s>>>6),this.Ri(128|63&s)}}this.Ii()}mi(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Vi(n);else if(n<2048)this.Vi(960|n>>>6),this.Vi(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Vi(480|n>>>12),this.Vi(128|63&n>>>6),this.Vi(128|63&n);else{const s=t.codePointAt(0);this.Vi(240|s>>>18),this.Vi(128|63&s>>>12),this.Vi(128|63&s>>>6),this.Vi(128|63&s)}}this.di()}pi(e){const t=this.gi(e),n=Qf(t);this.yi(1+n),this.buffer[this.position++]=255&n;for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=255&t[s]}wi(e){const t=this.gi(e),n=Qf(t);this.yi(1+n),this.buffer[this.position++]=~(255&n);for(let s=t.length-n;s<t.length;++s)this.buffer[this.position++]=~(255&t[s])}bi(){this.Si(cs),this.Si(255)}Di(){this.xi(cs),this.xi(255)}reset(){this.position=0}seed(e){this.yi(e.length),this.buffer.set(e,this.position),this.position+=e.length}Ci(){return this.buffer.slice(0,this.position)}gi(e){const t=function(i){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,i,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let s=1;s<t.length;++s)t[s]^=n?255:0;return t}Ri(e){const t=255&e;t===0?(this.Si(0),this.Si(255)):t===cs?(this.Si(cs),this.Si(0)):this.Si(t)}Vi(e){const t=255&e;t===0?(this.xi(0),this.xi(255)):t===cs?(this.xi(cs),this.xi(0)):this.xi(e)}Ii(){this.Si(0),this.Si(1)}di(){this.xi(0),this.xi(1)}Si(e){this.yi(1),this.buffer[this.position++]=e}xi(e){this.yi(1),this.buffer[this.position++]=~e}yi(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const s=new Uint8Array(n);s.set(this.buffer),this.buffer=s}}class GA{constructor(e){this.Fi=e}oi(e){this.Fi.Pi(e)}ii(e){this.Fi.fi(e)}ri(e){this.Fi.pi(e)}ti(){this.Fi.bi()}}class UA{constructor(e){this.Fi=e}oi(e){this.Fi.Ai(e)}ii(e){this.Fi.mi(e)}ri(e){this.Fi.wi(e)}ti(){this.Fi.Di()}}class Ii{constructor(){this.Fi=new MA,this.ascending=new GA(this.Fi),this.descending=new UA(this.Fi)}seed(e){this.Fi.seed(e)}Oi(e){return e===0?this.ascending:this.descending}Ci(){return this.Fi.Ci()}reset(){this.Fi.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class br{constructor(e,t,n,s){this.Mi=e,this.Ni=t,this.Li=n,this.Bi=s}Ui(){const e=this.Bi.length,t=e===0||this.Bi[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.Bi,0),t!==e?n.set([0],this.Bi.length):++n[n.length-1],new br(this.Mi,this.Ni,this.Li,n)}ki(e,t,n){return{indexId:this.Mi,uid:e,arrayValue:wa(this.Li),directionalValue:wa(this.Bi),orderedDocumentKey:wa(t),documentKey:n.path.toArray()}}qi(e,t,n){const s=this.ki(e,t,n);return[s.indexId,s.uid,s.arrayValue,s.directionalValue,s.orderedDocumentKey,s.documentKey]}}function Nn(r,e){let t=r.Mi-e.Mi;return t!==0?t:(t=Wf(r.Li,e.Li),t!==0?t:(t=Wf(r.Bi,e.Bi),t!==0?t:q.comparator(r.Ni,e.Ni)))}function Wf(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function wa(r){return cp()?function(t){let n="";for(let s=0;s<t.length;s++)n+=String.fromCharCode(t[s]);return n}(r):r}function Yf(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n}(r)}class Xf{constructor(e){this.$i=new pe((t,n)=>ke.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.Ki=e.orderBy,this.Qi=[];for(const t of e.filters){const n=t;n.isInequality()?this.$i=this.$i.add(n):this.Qi.push(n)}}get Wi(){return this.$i.size>1}Gi(e){if(H(e.collectionGroup===this.collectionId,49279),this.Wi)return!1;const t=iB(e);if(t!==void 0&&!this.zi(t))return!1;const n=yr(e);let s=new Set,i=0,o=0;for(;i<n.length&&this.zi(n[i]);++i)s=s.add(n[i].fieldPath.canonicalString());if(i===n.length)return!0;if(this.$i.size>0){const a=this.$i.getIterator().getNext();if(!s.has(a.field.canonicalString())){const c=n[i];if(!this.ji(a,c)||!this.Hi(this.Ki[o++],c))return!1}++i}for(;i<n.length;++i){const a=n[i];if(o>=this.Ki.length||!this.Hi(this.Ki[o++],a))return!1}return!0}Ji(){if(this.Wi)return null;let e=new pe(ke.comparator);const t=[];for(const n of this.Qi)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new ma(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new ma(n.field,0))}for(const n of this.Ki)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new ma(n.field,n.dir==="asc"?0:1)));return new xa(xa.UNKNOWN_ID,this.collectionId,t,ro.empty())}zi(e){for(const t of this.Qi)if(this.ji(t,e))return!0;return!1}ji(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}Hi(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Im(r){if(H(r instanceof le||r instanceof me,20012),r instanceof le){if(r instanceof ng){const t=r.value.arrayValue?.values?.map(n=>le.create(r.field,"==",n))||[];return me.create(t,"or")}return r}const e=r.filters.map(t=>Im(t));return me.create(e,r.op)}function HA(r){if(r.getFilters().length===0)return[];const e=DB(Im(r));return H(ym(e),7391),EB(e)||_B(e)?[e]:e.getFilters()}function EB(r){return r instanceof le}function _B(r){return r instanceof me&&WB(r)}function ym(r){return EB(r)||_B(r)||function(t){if(t instanceof me&&rB(t)){for(const n of t.getFilters())if(!EB(n)&&!_B(n))return!1;return!0}return!1}(r)}function DB(r){if(H(r instanceof le||r instanceof me,34018),r instanceof le)return r;if(r.filters.length===1)return DB(r.filters[0]);const e=r.filters.map(n=>DB(n));let t=me.create(e,r.op);return t=$a(t),ym(t)?t:(H(t instanceof me,64498),H(Fs(t),40251),H(t.filters.length>1,57927),t.filters.reduce((n,s)=>Rl(n,s)))}function Rl(r,e){let t;return H(r instanceof le||r instanceof me,38388),H(e instanceof le||e instanceof me,25473),t=r instanceof le?e instanceof le?function(s,i){return me.create([s,i],"and")}(r,e):Zf(r,e):e instanceof le?Zf(e,r):function(s,i){if(H(s.filters.length>0&&i.filters.length>0,48005),Fs(s)&&Fs(i))return Zp(s,i.getFilters());const o=rB(s)?s:i,a=rB(s)?i:s,c=o.filters.map(B=>Rl(B,a));return me.create(c,"or")}(r,e),$a(t)}function Zf(r,e){if(Fs(e))return Zp(e,r.getFilters());{const t=e.filters.map(n=>Rl(r,n));return me.create(t,"or")}}function $a(r){if(H(r instanceof le||r instanceof me,11850),r instanceof le)return r;const e=r.getFilters();if(e.length===1)return $a(e[0]);if(Yp(r))return r;const t=e.map(s=>$a(s)),n=[];return t.forEach(s=>{s instanceof le?n.push(s):s instanceof me&&(s.op===r.op?n.push(...s.filters):n.push(s))}),n.length===1?n[0]:me.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jA{constructor(){this.Yi=new bl}addToCollectionParentIndex(e,t){return this.Yi.add(t),b.resolve()}getCollectionParents(e,t){return b.resolve(this.Yi.getEntries(t))}addFieldIndex(e,t){return b.resolve()}deleteFieldIndex(e,t){return b.resolve()}deleteAllFieldIndexes(e){return b.resolve()}createTargetIndexes(e,t){return b.resolve()}getDocumentsMatchingTarget(e,t){return b.resolve(null)}getIndexType(e,t){return b.resolve(0)}getFieldIndexes(e,t){return b.resolve([])}getNextCollectionGroupToUpdate(e){return b.resolve(null)}getMinOffset(e,t){return b.resolve(Tt.min())}getMinOffsetFromCollectionGroup(e,t){return b.resolve(Tt.min())}updateCollectionGroup(e,t,n){return b.resolve()}updateIndexEntries(e,t){return b.resolve()}}class bl{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t]||new pe(ue.comparator),i=!s.has(n);return this.index[t]=s.add(n),i}has(e){const t=e.lastSegment(),n=e.popLast(),s=this.index[t];return s&&s.has(n)}getEntries(e){return(this.index[e]||new pe(ue.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eC="IndexedDbIndexManager",la=new Uint8Array(0);class qA{constructor(e,t){this.databaseId=t,this.Zi=new bl,this.Xi=new In(n=>Va(n),(n,s)=>XB(n,s)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.Zi.has(t)){const n=t.lastSegment(),s=t.popLast();e.addOnCommittedListener(()=>{this.Zi.add(t)});const i={collectionId:n,parent:et(s)};return tC(e).put(i)}return b.resolve()}getCollectionParents(e,t){const n=[],s=IDBKeyRange.bound([t,""],[Pp(t),""],!1,!0);return tC(e).Kn(s).next(i=>{for(const o of i){if(o.collectionId!==t)break;n.push($t(o.parent))}return n})}addFieldIndex(e,t){const n=yi(e),s=function(a){return{indexId:a.indexId,collectionGroup:a.collectionGroup,fields:a.fields.map(c=>[c.fieldPath.canonicalString(),c.kind])}}(t);delete s.indexId;const i=n.add(s);if(t.indexState){const o=ls(e);return i.next(a=>{o.put(Kf(a,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return i.next()}deleteFieldIndex(e,t){const n=yi(e),s=ls(e),i=Bs(e);return n.delete(t.indexId).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=yi(e),n=Bs(e),s=ls(e);return t.Gn().next(()=>n.Gn()).next(()=>s.Gn())}createTargetIndexes(e,t){return b.forEach(this.es(t),n=>this.getIndexType(e,n).next(s=>{if(s===0||s===1){const i=new Xf(n).Ji();if(i!=null)return this.addFieldIndex(e,i)}}))}getDocumentsMatchingTarget(e,t){const n=Bs(e);let s=!0;const i=new Map;return b.forEach(this.es(t),o=>this.ts(e,o).next(a=>{s&&(s=!!a),i.set(o,a)})).next(()=>{if(s){let o=ie();const a=[];return b.forEach(i,(c,B)=>{G(eC,`Using index ${function(te){return`id=${te.indexId}|cg=${te.collectionGroup}|f=${te.fields.map(ce=>`${ce.fieldPath}:${ce.kind}`).join(",")}`}(c)} to execute ${Va(t)}`);const h=function(te,ce){const fe=iB(ce);if(fe===void 0)return null;for(const oe of ka(te,fe.fieldPath))switch(oe.op){case"array-contains-any":return oe.value.arrayValue.values||[];case"array-contains":return[oe.value]}return null}(B,c),d=function(te,ce){const fe=new Map;for(const oe of yr(ce))for(const y of ka(te,oe.fieldPath))switch(y.op){case"==":case"in":fe.set(oe.fieldPath.canonicalString(),y.value);break;case"not-in":case"!=":return fe.set(oe.fieldPath.canonicalString(),y.value),Array.from(fe.values())}return null}(B,c),C=function(te,ce){const fe=[];let oe=!0;for(const y of yr(ce)){const m=y.kind===0?_f(te,y.fieldPath,te.startAt):Df(te,y.fieldPath,te.startAt);fe.push(m.value),oe&&(oe=m.inclusive)}return new Ns(fe,oe)}(B,c),I=function(te,ce){const fe=[];let oe=!0;for(const y of yr(ce)){const m=y.kind===0?Df(te,y.fieldPath,te.endAt):_f(te,y.fieldPath,te.endAt);fe.push(m.value),oe&&(oe=m.inclusive)}return new Ns(fe,oe)}(B,c),R=this.ns(c,B,C),N=this.ns(c,B,I),M=this.rs(c,B,d),K=this.ss(c.indexId,h,R,C.inclusive,N,I.inclusive,M);return b.forEach(K,Z=>n.Wn(Z,t.limit).next(te=>{te.forEach(ce=>{const fe=q.fromSegments(ce.documentKey);o.has(fe)||(o=o.add(fe),a.push(fe))})}))}).next(()=>a)}return b.resolve(null)})}es(e){let t=this.Xi.get(e);return t||(e.filters.length===0?t=[e]:t=HA(me.create(e.filters,"and")).map(n=>oB(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Xi.set(e,t),t)}ss(e,t,n,s,i,o,a){const c=(t!=null?t.length:1)*Math.max(n.length,i.length),B=c/(t!=null?t.length:1),h=[];for(let d=0;d<c;++d){const C=t?this._s(t[d/B]):la,I=this.us(e,C,n[d%B],s),R=this.cs(e,C,i[d%B],o),N=a.map(M=>this.us(e,C,M,!0));h.push(...this.createRange(I,R,N))}return h}us(e,t,n,s){const i=new br(e,q.empty(),t,n);return s?i:i.Ui()}cs(e,t,n,s){const i=new br(e,q.empty(),t,n);return s?i.Ui():i}ts(e,t){const n=new Xf(t),s=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,s).next(i=>{let o=null;for(const a of i)n.Gi(a)&&(!o||a.fields.length>o.fields.length)&&(o=a);return o})}getIndexType(e,t){let n=2;const s=this.es(t);return b.forEach(s,i=>this.ts(e,i).next(o=>{o?n!==0&&o.fields.length<function(c){let B=new pe(ke.comparator),h=!1;for(const d of c.filters)for(const C of d.getFlattenedFilters())C.field.isKeyField()||(C.op==="array-contains"||C.op==="array-contains-any"?h=!0:B=B.add(C.field));for(const d of c.orderBy)d.field.isKeyField()||(B=B.add(d.field));return B.size+(h?1:0)}(i)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&s.length>1&&n===2?1:n)}ls(e,t){const n=new Ii;for(const s of yr(e)){const i=t.data.field(s.fieldPath);if(i==null)return null;const o=n.Oi(s.kind);Rr.Ti.Xr(i,o)}return n.Ci()}_s(e){const t=new Ii;return Rr.Ti.Xr(e,t.Oi(0)),t.Ci()}Es(e,t){const n=new Ii;return Rr.Ti.Xr(Zi(this.databaseId,t),n.Oi(function(i){const o=yr(i);return o.length===0?0:o[o.length-1].kind}(e))),n.Ci()}rs(e,t,n){if(n===null)return[];let s=[];s.push(new Ii);let i=0;for(const o of yr(e)){const a=n[i++];for(const c of s)if(this.hs(t,o.fieldPath)&&er(a))s=this.Ts(s,o,a);else{const B=c.Oi(o.kind);Rr.Ti.Xr(a,B)}}return this.Ps(s)}ns(e,t,n){return this.rs(e,t,n.position)}Ps(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].Ci();return t}Ts(e,t,n){const s=[...e],i=[];for(const o of n.arrayValue.values||[])for(const a of s){const c=new Ii;c.seed(a.Ci()),Rr.Ti.Xr(o,c.Oi(t.kind)),i.push(c)}return i}hs(e,t){return!!e.filters.find(n=>n instanceof le&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=yi(e),s=ls(e);return(t?n.Kn(CB,IDBKeyRange.bound(t,t)):n.Kn()).next(i=>{const o=[];return b.forEach(i,a=>s.get([a.indexId,this.uid]).next(c=>{o.push(function(h,d){const C=d?new ro(d.sequenceNumber,new Tt(Kr(d.readTime),new q($t(d.documentKey)),d.largestBatchId)):ro.empty(),I=h.fields.map(([R,N])=>new ma(ke.fromServerFormat(R),N));return new xa(h.indexId,h.collectionGroup,I,C)}(a,c))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,s)=>{const i=n.indexState.sequenceNumber-s.indexState.sequenceNumber;return i!==0?i:se(n.collectionGroup,s.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const s=yi(e),i=ls(e);return this.Rs(e).next(o=>s.Kn(CB,IDBKeyRange.bound(t,t)).next(a=>b.forEach(a,c=>i.put(Kf(c.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return b.forEach(t,(s,i)=>{const o=n.get(s.collectionGroup);return(o?b.resolve(o):this.getFieldIndexes(e,s.collectionGroup)).next(a=>(n.set(s.collectionGroup,a),b.forEach(a,c=>this.Is(e,s,c).next(B=>{const h=this.As(i,c);return B.isEqual(h)?b.resolve():this.Vs(e,i,c,B,h)}))))})}ds(e,t,n,s){return Bs(e).put(s.ki(this.uid,this.Es(n,t.key),t.key))}fs(e,t,n,s){return Bs(e).delete(s.qi(this.uid,this.Es(n,t.key),t.key))}Is(e,t,n){const s=Bs(e);let i=new pe(Nn);return s.jn({index:Bm,range:IDBKeyRange.only([n.indexId,this.uid,wa(this.Es(n,t))])},(o,a)=>{i=i.add(new br(n.indexId,t,Yf(a.arrayValue),Yf(a.directionalValue)))}).next(()=>i)}As(e,t){let n=new pe(Nn);const s=this.ls(t,e);if(s==null)return n;const i=iB(t);if(i!=null){const o=e.data.field(i.fieldPath);if(er(o))for(const a of o.arrayValue.values||[])n=n.add(new br(t.indexId,e.key,this._s(a),s))}else n=n.add(new br(t.indexId,e.key,la,s));return n}Vs(e,t,n,s,i){G(eC,"Updating index entries for document '%s'",t.key);const o=[];return function(c,B,h,d,C){const I=c.getIterator(),R=B.getIterator();let N=os(I),M=os(R);for(;N||M;){let K=!1,Z=!1;if(N&&M){const te=h(N,M);te<0?Z=!0:te>0&&(K=!0)}else N!=null?Z=!0:K=!0;K?(d(M),M=os(R)):Z?(C(N),N=os(I)):(N=os(I),M=os(R))}}(s,i,Nn,a=>{o.push(this.ds(e,t,n,a))},a=>{o.push(this.fs(e,t,n,a))}),b.waitFor(o)}Rs(e){let t=1;return ls(e).jn({index:cm,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,s,i)=>{i.done(),t=s.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,a)=>Nn(o,a)).filter((o,a,c)=>!a||Nn(o,c[a-1])!==0);const s=[];s.push(e);for(const o of n){const a=Nn(o,e),c=Nn(o,t);if(a===0)s[0]=e.Ui();else if(a>0&&c<0)s.push(o),s.push(o.Ui());else if(c>0)break}s.push(t);const i=[];for(let o=0;o<s.length;o+=2){if(this.ps(s[o],s[o+1]))return[];const a=s[o].qi(this.uid,la,q.empty()),c=s[o+1].qi(this.uid,la,q.empty());i.push(IDBKeyRange.bound(a,c))}return i}ps(e,t){return Nn(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(nC)}getMinOffset(e,t){return b.mapArray(this.es(t),n=>this.ts(e,n).next(s=>s||$(44426))).next(nC)}}function tC(r){return Ge(r,fo)}function Bs(r){return Ge(r,Ji)}function yi(r){return Ge(r,wl)}function ls(r){return Ge(r,qi)}function nC(r){H(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const s=r[n].indexState.offset;YB(s,e)<0&&(e=s),t<s.largestBatchId&&(t=s.largestBatchId)}return new Tt(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class En{constructor(e){this.gs=e}next(){return this.gs+=2,this.gs}static ys(){return new En(0)}static ws(){return new En(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JA{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.bs(e).next(t=>{const n=new En(t.highestTargetId);return t.highestTargetId=n.next(),this.Ss(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.bs(e).next(t=>X.fromTimestamp(new ge(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.bs(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.bs(e).next(s=>(s.highestListenSequenceNumber=t,n&&(s.lastRemoteSnapshotVersion=n.toTimestamp()),t>s.highestListenSequenceNumber&&(s.highestListenSequenceNumber=t),this.Ss(e,s)))}addTargetData(e,t){return this.vs(e,t).next(()=>this.bs(e).next(n=>(n.targetCount+=1,this.Ds(t,n),this.Ss(e,n))))}updateTargetData(e,t){return this.vs(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>hs(e).delete(t.targetId)).next(()=>this.bs(e)).next(n=>(H(n.targetCount>0,8065),n.targetCount-=1,this.Ss(e,n)))}removeTargets(e,t,n){let s=0;const i=[];return hs(e).jn((o,a)=>{const c=Ni(this.serializer,a);c.sequenceNumber<=t&&n.get(c.targetId)===null&&(s++,i.push(this.removeTargetData(e,c)))}).next(()=>b.waitFor(i)).next(()=>s)}forEachTarget(e,t){return hs(e).jn((n,s)=>{const i=Ni(this.serializer,s);t(i)})}bs(e){return rC(e).get(Ja).next(t=>(H(t!==null,2888),t))}Ss(e,t){return rC(e).put(Ja,t)}vs(e,t){return hs(e).put(mm(this.serializer,t))}Ds(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.bs(e).next(t=>t.targetCount)}getTargetData(e,t){const n=Pu(t),s=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let i=null;return hs(e).jn({range:s,index:um},(o,a,c)=>{const B=Ni(this.serializer,a);_l(t,B.target)&&(i=B,c.done())}).next(()=>i)}addMatchingKeys(e,t,n){const s=[],i=Mn(e);return t.forEach(o=>{const a=et(o.path);s.push(i.put({targetId:n,path:a})),s.push(this.referenceDelegate.addReference(e,n,o))}),b.waitFor(s)}removeMatchingKeys(e,t,n){const s=Mn(e);return b.forEach(t,i=>{const o=et(i.path);return b.waitFor([s.delete([n,o]),this.referenceDelegate.removeReference(e,n,i)])})}removeMatchingKeysForTargetId(e,t){const n=Mn(e),s=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(s)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),s=Mn(e);let i=ie();return s.jn({range:n,zn:!0},(o,a,c)=>{const B=$t(o[1]),h=new q(B);i=i.add(h)}).next(()=>i)}containsKey(e,t){const n=et(t.path),s=IDBKeyRange.bound([n],[Pp(n)],!1,!0);let i=0;return Mn(e).jn({index:yl,zn:!0,range:s},([o,a],c,B)=>{o!==0&&(i++,B.done())}).next(()=>i>0)}ge(e,t){return hs(e).get(t).next(n=>n?Ni(this.serializer,n):null)}}function hs(r){return Ge(r,ks)}function rC(r){return Ge(r,Vr)}function Mn(r){return Ge(r,Ms)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class KA{constructor(e,t){this.db=e,this.garbageCollector=Vg(this,t)}rr(e){const t=this.xs(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(s=>n+s))}xs(e){let t=0;return this.ir(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}ir(e,t){return this.Cs(e,(n,s)=>t(s))}addReference(e,t,n){return ha(e,n)}removeReference(e,t,n){return ha(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return ha(e,t)}Fs(e,t){return function(s,i){let o=!1;return Dm(s).Hn(a=>_m(s,a,i).next(c=>(c&&(o=!0),b.resolve(!c)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[];let i=0;return this.Cs(e,(o,a)=>{if(a<=t){const c=this.Fs(e,o).next(B=>{if(!B)return i++,n.getEntry(e,o).next(()=>(n.removeEntry(o,X.min()),Mn(e).delete(function(d){return[0,et(d.path)]}(o))))});s.push(c)}}).next(()=>b.waitFor(s)).next(()=>n.apply(e)).next(()=>i)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return ha(e,t)}Cs(e,t){const n=Mn(e);let s,i=lt.yn;return n.jn({index:yl},([o,a],{path:c,sequenceNumber:B})=>{o===0?(i!==lt.yn&&t(new q($t(s)),i),i=B,s=c):i=lt.yn}).next(()=>{i!==lt.yn&&t(new q($t(s)),i)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function ha(r,e){return Mn(r).put(function(n,s){return{targetId:0,path:et(n.path),sequenceNumber:s}}(e,r.currentSequenceNumber))}// Copyright 2024 Google LLC* @license
function wm(r,e){let t=e;for(const n of r.stages)t=zA({serializer:r.serializer,serverTimestampBehavior:r.listenOptions?.serverTimestampBehavior},n,t);return t}function xu(r,e){return wm(r,[e]).length>0}function Tm(r,e){return Pe(r)?xu(r,e):_u(r,e)}function zA(r,e,t){if(e instanceof bo)return function(s,i,o){return o.filter(a=>a.isFoundDocument()&&`/${a.key.getCollectionPath().canonicalString()}`===i.Er)}(0,e,t);if(e instanceof So)return function(s,i,o){return o.filter(a=>{const c=ji(ne(i.condition).evaluate(s,a));return c!==void 0&&Ft(c,dt)})}(r,e,t);if(e instanceof Po)return function(s,i,o){return o.filter(a=>a.isFoundDocument()&&a.key.getCollectionPath().lastSegment()===i.collectionId)}(0,e,t);if(e instanceof Au)return function(s,i,o){return o.filter(a=>a.isFoundDocument())}(0,0,t);if(e instanceof vu)return function(s,i,o){return o.filter(a=>a.isFoundDocument()&&i.Tr.has(a.key.path.toStringWithLeadingSlash()))}(0,e,t);if(e instanceof sr)return function(s,i,o){return o.slice(0,i.limit)}(0,e,t);if(e instanceof zt)return function(s,i,o){const a=i.orderings.map(c=>({Os:ne(c.expr),direction:c.direction}));return[...o].sort((c,B)=>{for(const{Os:h,direction:d}of a){const C=ji(h.evaluate(s,c)),I=ji(h.evaluate(s,B)),R=tt(C??Wt,I??Wt);if(R!==0)return d==="ascending"?R:-R}return 0})}(r,e,t);throw new Error(`Unknown stage: ${e._name}`)}function IB(r){const e=function(n){for(let s=n.stages.length-1;s>=0;s--){const i=n.stages[s];if(i instanceof zt)return i.orderings}throw new Error("Pipeline must contain at least one Sort stage")}(r);return(t,n)=>{for(const s of e){const i=ji(ne(s.expr).evaluate({serializer:r.serializer},t)),o=ji(ne(s.expr).evaluate({serializer:r.serializer},n)),a=tt(i||Wt,o||Wt);if(a!==0)return s.direction==="ascending"?a:-a}return 0}}function Pc(r){for(let e=r.stages.length-1;e>=0;e--){const t=r.stages[e];if(t instanceof sr)return{limit:t.limit}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Am{constructor(){this.changes=new In(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,be.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?b.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $A{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return Fn(e).put(n)}removeEntry(e,t,n){return Fn(e).delete(function(i,o){const a=i.path.toArray();return[a.slice(0,a.length-2),a[a.length-2],za(o),a[a.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Ms(e,n)))}getEntry(e,t){let n=be.newInvalidDocument(t);return Fn(e).jn({index:ya,range:IDBKeyRange.only(wi(t))},(s,i)=>{n=this.Ns(t,i)}).next(()=>n)}Ls(e,t){let n={size:0,document:be.newInvalidDocument(t)};return Fn(e).jn({index:ya,range:IDBKeyRange.only(wi(t))},(s,i)=>{n={document:this.Ns(t,i),size:Ka(i)}}).next(()=>n)}getEntries(e,t){let n=Ve();return this.Bs(e,t,(s,i)=>{const o=this.Ns(s,i);n=n.insert(s,o)}).next(()=>n)}getAllEntries(e){let t=Ve();return Fn(e).jn((n,s)=>{const i=this.Ns(q.fromSegments(s.prefixPath.concat(s.collectionGroup,s.documentId)),s);t=t.insert(i.key,i)}).next(()=>t)}Us(e,t){let n=Ve(),s=new _e(q.comparator);return this.Bs(e,t,(i,o)=>{const a=this.Ns(i,o);n=n.insert(i,a),s=s.insert(i,Ka(o))}).next(()=>({documents:n,ks:s}))}Bs(e,t,n){if(t.isEmpty())return b.resolve();let s=new pe(oC);t.forEach(c=>s=s.add(c));const i=IDBKeyRange.bound(wi(s.first()),wi(s.last())),o=s.getIterator();let a=o.getNext();return Fn(e).jn({index:ya,range:i},(c,B,h)=>{const d=q.fromSegments([...B.prefixPath,B.collectionGroup,B.documentId]);for(;a&&oC(a,d)<0;)n(a,null),a=o.getNext();a&&a.isEqual(d)&&(n(a,B),a=o.hasNext()?o.getNext():null),a?h.$n(wi(a)):h.done()}).next(()=>{for(;a;)n(a,null),a=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,s,i){const o=Pe(t)?ue.fromString(Oo(t)):t.path,a=[o.popLast().toArray(),o.lastSegment(),za(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],c=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Fn(e).Kn(IDBKeyRange.bound(a,c,!0)).next(B=>{i?.incrementDocumentReadCount(B.length);let h=Ve();for(const d of B){const C=this.Ns(q.fromSegments(d.prefixPath.concat(d.collectionGroup,d.documentId)),d);C.isFoundDocument()&&(Tm(t,C)||s.has(C.key))&&(h=h.insert(C.key,C))}return h})}getAllFromCollectionGroup(e,t,n,s){let i=Ve();const o=iC(t,n),a=iC(t,Tt.max());return Fn(e).jn({index:am,range:IDBKeyRange.bound(o,a,!0)},(c,B,h)=>{const d=this.Ns(q.fromSegments(B.prefixPath.concat(B.collectionGroup,B.documentId)),B);i=i.insert(d.key,d),i.size===s&&h.done()}).next(()=>i)}newChangeBuffer(e){return new QA(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return sC(e).get(fB).next(t=>(H(!!t,20021),t))}Ms(e,t){return sC(e).put(fB,t)}Ns(e,t){if(t){const n=FA(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(X.min())))return n}return be.newInvalidDocument(e)}}function vm(r){return new $A(r)}class QA extends Am{constructor(e,t){super(),this.qs=e,this.trackRemovals=t,this.$s=new In(n=>n.toString(),(n,s)=>n.isEqual(s))}applyChanges(e){const t=[];let n=0,s=new pe((i,o)=>se(i.canonicalString(),o.canonicalString()));return this.changes.forEach((i,o)=>{const a=this.$s.get(i);if(t.push(this.qs.removeEntry(e,i,a.readTime)),o.isValidDocument()){const c=qf(this.qs.serializer,o);s=s.add(i.path.popLast());const B=Ka(c);n+=B-a.size,t.push(this.qs.addEntry(e,i,c))}else if(n-=a.size,this.trackRemovals){const c=qf(this.qs.serializer,o.convertToNoDocument(X.min()));t.push(this.qs.addEntry(e,i,c))}}),s.forEach(i=>{t.push(this.qs.indexManager.addToCollectionParentIndex(e,i))}),t.push(this.qs.updateMetadata(e,n)),b.waitFor(t)}getFromCache(e,t){return this.qs.Ls(e,t).next(n=>(this.$s.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.qs.Us(e,t).next(({documents:n,ks:s})=>(s.forEach((i,o)=>{this.$s.set(i,{size:o,readTime:n.get(i).readTime})}),n))}}function sC(r){return Ge(r,ho)}function Fn(r){return Ge(r,qa)}function wi(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function iC(r,e){const t=e.documentKey.path.toArray();return[r,za(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function oC(r,e){const t=r.path.toArray(),n=e.path.toArray();let s=0;for(let i=0;i<t.length-2&&i<n.length-2;++i)if(s=se(t[i],n[i]),s)return s;return s=se(t.length,n.length),s||(s=se(t[t.length-2],n[n.length-2]),s||se(t[t.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WA{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rm{constructor(e,t,n,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=s}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(s=>(n=s,this.remoteDocumentCache.getEntry(e,t))).next(s=>(n!==null&&Vi(n.mutation,s,Bt.empty(),ge.now()),s))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,ie()).next(()=>n))}getLocalViewOfDocuments(e,t,n=ie()){const s=Pt();return this.populateOverlays(e,s,t).next(()=>this.computeViews(e,t,s,n).next(i=>{let o=Tr();return i.forEach((a,c)=>{o=o.insert(a,c.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=Pt();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,ie()))}populateOverlays(e,t,n){const s=[];return n.forEach(i=>{t.has(i)||s.push(i)}),this.documentOverlayCache.getOverlays(e,s).next(i=>{i.forEach((o,a)=>{t.set(o,a)})})}computeViews(e,t,n,s){let i=Ve();const o=Gi(),a=function(){return Gi()}();return t.forEach((c,B)=>{const h=n.get(B.key);s.has(B.key)&&(h===void 0||h.mutation instanceof Dn)?i=i.insert(B.key,B):h!==void 0?(o.set(B.key,h.mutation.getFieldMask()),Vi(h.mutation,B,h.mutation.getFieldMask(),ge.now())):o.set(B.key,Bt.empty())}),this.recalculateAndSaveOverlays(e,i).next(c=>(c.forEach((B,h)=>o.set(B,h)),t.forEach((B,h)=>a.set(B,new WA(h,o.get(B)??null))),a))}recalculateAndSaveOverlays(e,t){const n=Gi();let s=new _e((o,a)=>o-a),i=ie();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const a of o)a.keys().forEach(c=>{const B=t.get(c);if(B===null)return;let h=n.get(c)||Bt.empty();h=a.applyToLocalView(B,h),n.set(c,h);const d=(s.get(a.batchId)||ie()).add(c);s=s.insert(a.batchId,d)})}).next(()=>{const o=[],a=s.getReverseIterator();for(;a.hasNext();){const c=a.getNext(),B=c.key,h=c.value,d=Bg();h.forEach(C=>{if(!i.has(C)){const I=zp(t.get(C),n.get(C));I!==null&&d.set(C,I),i=i.add(C)}}),o.push(this.documentOverlayCache.saveOverlays(e,B,d))}return b.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,s){return Pe(t)?this.getDocumentsMatchingPipeline(e,t,n,s):Ny(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):og(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,s):this.getDocumentsMatchingCollectionQuery(e,t,n,s)}getNextDocuments(e,t,n,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,s).next(i=>{const o=s-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,s-i.size):b.resolve(Pt());let a=Ls,c=i;return o.next(B=>b.forEach(B,(h,d)=>(a<d.largestBatchId&&(a=d.largestBatchId),i.get(h)?b.resolve():this.remoteDocumentCache.getEntry(e,h).next(C=>{c=c.insert(h,C)}))).next(()=>this.populateOverlays(e,B,i)).next(()=>this.computeViews(e,c,B,ie())).next(h=>({batchId:a,changes:cg(h)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new q(t)).next(n=>{let s=Tr();return n.isFoundDocument()&&(s=s.insert(n.key,n)),s})}getDocumentsMatchingCollectionGroupQuery(e,t,n,s){const i=t.collectionGroup;let o=Tr();return this.indexManager.getCollectionParents(e,i).next(a=>b.forEach(a,c=>{const B=function(d,C){return new Ao(C,null,d.explicitOrderBy.slice(),d.filters.slice(),d.limit,d.limitType,d.startAt,d.endAt)}(t,c.child(i));return this.getDocumentsMatchingCollectionQuery(e,B,n,s).next(h=>{h.forEach((d,C)=>{o=o.insert(d,C)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,s){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(i=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,s))).next(o=>this.retrieveMatchingLocalDocuments(i,o,a=>_u(t,a)))}getDocumentsMatchingPipeline(e,t,n,s){if(hn(t)==="collection_group"){const i=dl(t);let o=Tr();return this.indexManager.getCollectionParents(e,i).next(a=>b.forEach(a,c=>{const B=function(d,C){const I=d.stages.map(R=>R instanceof Po?new bo(C.canonicalString(),{}):R);return new Ze(d.serializer,I)}(t,c.child(i));return this.getDocumentsMatchingPipeline(e,B,n,s).next(h=>{h.forEach((d,C)=>{o=o.insert(d,C)})})}).next(()=>o))}{let i;return this.getOverlaysForPipeline(e,t,n.largestBatchId).next(o=>{switch(i=o,hn(t)){case"collection":return this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,i,s);case"documents":let a=ie();for(const c of Ua(t))a=a.add(q.fromPath(c));return this.remoteDocumentCache.getEntries(e,a);case"database":return this.remoteDocumentCache.getAllEntries(e);default:throw new U("invalid-argument",`Invalid pipeline source to execute offline: ${dn(t)}`)}}).next(o=>this.retrieveMatchingLocalDocuments(i,o,a=>xu(t,a)))}}retrieveMatchingLocalDocuments(e,t,n){e.forEach((i,o)=>{const a=o.getKey();t.get(a)===null&&(t=t.insert(a,be.newInvalidDocument(a)))});let s=Tr();return t.forEach((i,o)=>{const a=e.get(i);a!==void 0&&Vi(a.mutation,o,Bt.empty(),ge.now()),n(o)&&(s=s.insert(i,o))}),s}getOverlaysForPipeline(e,t,n){switch(hn(t)){case"collection":return this.documentOverlayCache.getOverlaysForCollection(e,ue.fromString(Oo(t)),n);case"collection_group":throw new U("invalid-argument",`Unexpected collection group pipeline: ${dn(t)}`);case"documents":return this.documentOverlayCache.getOverlays(e,Ua(t).map(s=>q.fromPath(s)));case"database":return this.documentOverlayCache.getAllOverlays(e,n);default:throw new U("invalid-argument",`Failed to get overlays for pipeline: ${dn(t)}`)}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YA{constructor(e){this.serializer=e,this.Ks=new Map,this.Qs=new Map}getBundleMetadata(e,t){return b.resolve(this.Ks.get(t))}saveBundleMetadata(e,t){return this.Ks.set(t.id,function(s){return{id:s.id,version:s.version,createTime:at(s.createTime)}}(t)),b.resolve()}getNamedQuery(e,t){return b.resolve(this.Qs.get(t))}saveNamedQuery(e,t){return this.Qs.set(t.name,function(s){return{name:s.name,query:Em(s.bundledQuery),readTime:at(s.readTime)}}(t)),b.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XA{constructor(){this.overlays=new _e(q.comparator),this.Ws=new Map}getOverlay(e,t){return b.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Pt();return b.forEach(t,s=>this.getOverlay(e,s).next(i=>{i!==null&&n.set(s,i)})).next(()=>n)}getAllOverlays(e,t){const n=Pt();return this.overlays.forEach((s,i)=>{i.largestBatchId>t&&n.set(s,i)}),b.resolve(n)}saveOverlays(e,t,n){return n.forEach((s,i)=>{this.Yr(e,t,i)}),b.resolve()}removeOverlaysForBatchId(e,t,n){const s=this.Ws.get(n);return s!==void 0&&(s.forEach(i=>this.overlays=this.overlays.remove(i)),this.Ws.delete(n)),b.resolve()}getOverlaysForCollection(e,t,n){const s=Pt(),i=t.length+1,o=new q(t.child("")),a=this.overlays.getIteratorFrom(o);for(;a.hasNext();){const c=a.getNext().value,B=c.getKey();if(!t.isPrefixOf(B.path))break;B.path.length===i&&c.largestBatchId>n&&s.set(c.getKey(),c)}return b.resolve(s)}getOverlaysForCollectionGroup(e,t,n,s){let i=new _e((B,h)=>B-h);const o=this.overlays.getIterator();for(;o.hasNext();){const B=o.getNext().value;if(B.getKey().getCollectionGroup()===t&&B.largestBatchId>n){let h=i.get(B.largestBatchId);h===null&&(h=Pt(),i=i.insert(B.largestBatchId,h)),h.set(B.getKey(),B)}}const a=Pt(),c=i.getIterator();for(;c.hasNext()&&(c.getNext().value.forEach((B,h)=>a.set(B,h)),!(a.size()>=s)););return b.resolve(a)}Yr(e,t,n){const s=this.overlays.get(n.key);if(s!==null){const o=this.Ws.get(s.largestBatchId).delete(n.key);this.Ws.set(s.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new vl(t,n));let i=this.Ws.get(t);i===void 0&&(i=ie(),this.Ws.set(t,i)),this.Ws.set(t,i.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZA{constructor(){this.sessionToken=Ae.EMPTY_BYTE_STRING}getSessionToken(e){return b.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,b.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pl{constructor(){this.Gs=new pe(je.zs),this.js=new pe(je.Hs)}isEmpty(){return this.Gs.isEmpty()}addReference(e,t){const n=new je(e,t);this.Gs=this.Gs.add(n),this.js=this.js.add(n)}Js(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Ys(new je(e,t))}Zs(e,t){e.forEach(n=>this.removeReference(n,t))}Xs(e){const t=new q(new ue([])),n=new je(t,e),s=new je(t,e+1),i=[];return this.js.forEachInRange([n,s],o=>{this.Ys(o),i.push(o.key)}),i}e_(){this.Gs.forEach(e=>this.Ys(e))}Ys(e){this.Gs=this.Gs.delete(e),this.js=this.js.delete(e)}t_(e){const t=new q(new ue([])),n=new je(t,e),s=new je(t,e+1);let i=ie();return this.js.forEachInRange([n,s],o=>{i=i.add(o.key)}),i}containsKey(e){const t=new je(e,0),n=this.Gs.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class je{constructor(e,t){this.key=e,this.n_=t}static zs(e,t){return q.comparator(e.key,t.key)||se(e.n_,t.n_)}static Hs(e,t){return se(e.n_,t.n_)||q.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ev{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Wr=1,this.r_=new pe(je.zs)}checkEmpty(e){return b.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,s){const i=this.Wr;this.Wr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Dl(i,t,n,s);this.mutationQueue.push(o);for(const a of s)this.r_=this.r_.add(new je(a.key,i)),this.indexManager.addToCollectionParentIndex(e,a.key.path.popLast());return b.resolve(o)}lookupMutationBatch(e,t){return b.resolve(this.i_(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,s=this.s_(n),i=s<0?0:s;return b.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return b.resolve(this.mutationQueue.length===0?Fr:this.Wr-1)}getAllMutationBatches(e){return b.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new je(t,0),s=new je(t,Number.POSITIVE_INFINITY),i=[];return this.r_.forEachInRange([n,s],o=>{const a=this.i_(o.n_);i.push(a)}),b.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new pe(se);return t.forEach(s=>{const i=new je(s,0),o=new je(s,Number.POSITIVE_INFINITY);this.r_.forEachInRange([i,o],a=>{n=n.add(a.n_)})}),b.resolve(this.__(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,s=n.length+1;let i=n;q.isDocumentKey(i)||(i=i.child(""));const o=new je(new q(i),0);let a=new pe(se);return this.r_.forEachWhile(c=>{const B=c.key.path;return!!n.isPrefixOf(B)&&(B.length===s&&(a=a.add(c.n_)),!0)},o),b.resolve(this.__(a))}__(e){const t=[];return e.forEach(n=>{const s=this.i_(n);s!==null&&t.push(s)}),t}removeMutationBatch(e,t){H(this.o_(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.r_;return b.forEach(t.mutations,s=>{const i=new je(s.key,t.batchId);return n=n.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)}).next(()=>{this.r_=n})}jr(e){}containsKey(e,t){const n=new je(t,0),s=this.r_.firstAfterOrEqual(n);return b.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,b.resolve()}o_(e,t){return this.s_(e)}s_(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}i_(e){const t=this.s_(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tv{constructor(e){this.a_=e,this.docs=function(){return new _e(q.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,s=this.docs.get(n),i=s?s.size:0,o=this.a_(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-i,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return b.resolve(n?n.document.mutableCopy():be.newInvalidDocument(t))}getEntries(e,t){let n=Ve();return t.forEach(s=>{const i=this.docs.get(s);n=n.insert(s,i?i.document.mutableCopy():be.newInvalidDocument(s))}),b.resolve(n)}getAllEntries(e){let t=Ve();return this.docs.forEach((n,s)=>{t=t.insert(n,s.document)}),b.resolve(t)}getDocumentsMatchingQuery(e,t,n,s){let i,o;Pe(t)?(i=ue.fromString(Oo(t)),o=h=>xu(t,h)):(i=t.path,o=h=>_u(t,h));let a=Ve();const c=new q(i.child("__id-9223372036854775808__")),B=this.docs.getIteratorFrom(c);for(;B.hasNext();){const{key:h,value:{document:d}}=B.getNext();if(!i.isPrefixOf(h.path))break;h.path.length>i.length+1||YB(sg(d),n)<=0||(s.has(d.key)||o(d))&&(a=a.insert(d.key,d.mutableCopy()))}return b.resolve(a)}getAllFromCollectionGroup(e,t,n,s){$(9500)}u_(e,t){return b.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new nv(this)}getSize(e){return b.resolve(this.size)}}class nv extends Am{constructor(e){super(),this.qs=e}applyChanges(e){const t=[];return this.changes.forEach((n,s)=>{s.isValidDocument()?t.push(this.qs.addEntry(e,s)):this.qs.removeEntry(n)}),b.waitFor(t)}getFromCache(e,t){return this.qs.getEntry(e,t)}getAllFromCache(e,t){return this.qs.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rv{constructor(e){this.persistence=e,this.c_=new In(t=>Pu(t),_l),this.lastRemoteSnapshotVersion=X.min(),this.highestTargetId=0,this.l_=0,this.E_=new Pl,this.targetCount=0,this.h_=En.ys()}forEachTarget(e,t){return this.c_.forEach((n,s)=>t(s)),b.resolve()}getLastRemoteSnapshotVersion(e){return b.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return b.resolve(this.l_)}allocateTargetId(e){return this.highestTargetId=this.h_.next(),b.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.l_&&(this.l_=t),b.resolve()}vs(e){this.c_.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.h_=new En(t),this.highestTargetId=t),e.sequenceNumber>this.l_&&(this.l_=e.sequenceNumber)}addTargetData(e,t){return this.vs(t),this.targetCount+=1,b.resolve()}updateTargetData(e,t){return this.vs(t),b.resolve()}removeTargetData(e,t){return this.c_.delete(t.target),this.E_.Xs(t.targetId),this.targetCount-=1,b.resolve()}removeTargets(e,t,n){let s=0;const i=[];return this.c_.forEach((o,a)=>{a.sequenceNumber<=t&&n.get(a.targetId)===null&&(this.c_.delete(o),i.push(this.removeMatchingKeysForTargetId(e,a.targetId)),s++)}),b.waitFor(i).next(()=>s)}getTargetCount(e){return b.resolve(this.targetCount)}getTargetData(e,t){const n=this.c_.get(t)||null;return b.resolve(n)}addMatchingKeys(e,t,n){return this.E_.Js(t,n),b.resolve()}removeMatchingKeys(e,t,n){this.E_.Zs(t,n);const s=this.persistence.referenceDelegate,i=[];return s&&t.forEach(o=>{i.push(s.markPotentiallyOrphaned(e,o))}),b.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this.E_.Xs(t),b.resolve()}getMatchingKeysForTargetId(e,t){const n=this.E_.t_(t);return b.resolve(n)}containsKey(e,t){return b.resolve(this.E_.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sl{constructor(e,t){this.T_={},this.overlays={},this.P_=new lt(0),this.R_=!1,this.R_=!0,this.I_=new ZA,this.referenceDelegate=e(this),this.A_=new rv(this),this.indexManager=new jA,this.remoteDocumentCache=function(s){return new tv(s)}(n=>this.referenceDelegate.V_(n)),this.serializer=new gm(t),this.d_=new YA(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.R_=!1,Promise.resolve()}get started(){return this.R_}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new XA,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.T_[e.toKey()];return n||(n=new ev(t,this.referenceDelegate),this.T_[e.toKey()]=n),n}getGlobalsCache(){return this.I_}getTargetCache(){return this.A_}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.d_}runTransaction(e,t,n){G("MemoryPersistence","Starting transaction:",e);const s=new sv(this.P_.next());return this.referenceDelegate.f_(),n(s).next(i=>this.referenceDelegate.m_(s).next(()=>i)).toPromise().then(i=>(s.raiseOnCommittedEvent(),i))}p_(e,t){return b.or(Object.values(this.T_).map(n=>()=>n.containsKey(e,t)))}}class sv extends Ng{constructor(e){super(),this.currentSequenceNumber=e}}class Vu{constructor(e){this.persistence=e,this.g_=new Pl,this.y_=null}static w_(e){return new Vu(e)}get b_(){if(this.y_)return this.y_;throw $(60996)}addReference(e,t,n){return this.g_.addReference(n,t),this.b_.delete(n.toString()),b.resolve()}removeReference(e,t,n){return this.g_.removeReference(n,t),this.b_.add(n.toString()),b.resolve()}markPotentiallyOrphaned(e,t){return this.b_.add(t.toString()),b.resolve()}removeTarget(e,t){this.g_.Xs(t.targetId).forEach(s=>this.b_.add(s.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(s=>{s.forEach(i=>this.b_.add(i.toString()))}).next(()=>n.removeTargetData(e,t))}f_(){this.y_=new Set}m_(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return b.forEach(this.b_,n=>{const s=q.fromPath(n);return this.S_(e,s).next(i=>{i||t.removeEntry(s,X.min())})}).next(()=>(this.y_=null,t.apply(e)))}updateLimboDocument(e,t){return this.S_(e,t).next(n=>{n?this.b_.delete(t.toString()):this.b_.add(t.toString())})}V_(e){return 0}S_(e,t){return b.or([()=>b.resolve(this.g_.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.p_(e,t)])}}class Qa{constructor(e,t){this.persistence=e,this.v_=new In(n=>et(n.path),(n,s)=>n.isEqual(s)),this.garbageCollector=Vg(this,t)}static w_(e,t){return new Qa(e,t)}f_(){}m_(e){return b.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}rr(e){const t=this.xs(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(s=>n+s))}xs(e){let t=0;return this.ir(e,n=>{t++}).next(()=>t)}ir(e,t){return b.forEach(this.v_,(n,s)=>this.Fs(e,n,s).next(i=>i?b.resolve():t(s)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const s=this.persistence.getRemoteDocumentCache(),i=s.newChangeBuffer();return s.u_(e,o=>this.Fs(e,o,t).next(a=>{a||(n++,i.removeEntry(o,X.min()))})).next(()=>i.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.v_.set(t,e.currentSequenceNumber),b.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.v_.set(n,e.currentSequenceNumber),b.resolve()}removeReference(e,t,n){return this.v_.set(n,e.currentSequenceNumber),b.resolve()}updateLimboDocument(e,t){return this.v_.set(t,e.currentSequenceNumber),b.resolve()}V_(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=pa(e.data.value)),t}Fs(e,t,n){return b.or([()=>this.persistence.p_(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const s=this.v_.get(t);return b.resolve(s!==void 0&&s>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iv{constructor(e){this.serializer=e}Mn(e,t,n,s){const i=new yu("createOrUpgrade",t);n<1&&s>=1&&(function(c){c.createObjectStore(Fo)}(e),function(c){c.createObjectStore(lo,{keyPath:cA}),c.createObjectStore(Lt,{keyPath:Hf,autoIncrement:!0}).createIndex(Or,jf,{unique:!0}),c.createObjectStore(Vs)}(e),aC(e),function(c){c.createObjectStore(wr)}(e));let o=b.resolve();return n<3&&s>=3&&(n!==0&&(function(c){c.deleteObjectStore(Ms),c.deleteObjectStore(ks),c.deleteObjectStore(Vr)}(e),aC(e)),o=o.next(()=>function(c){const B=c.store(Vr),h={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:X.min().toTimestamp(),targetCount:0};return B.put(Ja,h)}(i))),n<4&&s>=4&&(n!==0&&(o=o.next(()=>function(c,B){return B.store(Lt).Kn().next(d=>{c.deleteObjectStore(Lt),c.createObjectStore(Lt,{keyPath:Hf,autoIncrement:!0}).createIndex(Or,jf,{unique:!0});const C=B.store(Lt),I=d.map(R=>C.put(R));return b.waitFor(I)})}(e,i))),o=o.next(()=>{(function(c){c.createObjectStore(Gs,{keyPath:mA})})(e)})),n<5&&s>=5&&(o=o.next(()=>this.D_(i))),n<6&&s>=6&&(o=o.next(()=>(function(c){c.createObjectStore(ho)}(e),this.x_(i)))),n<7&&s>=7&&(o=o.next(()=>this.C_(i))),n<8&&s>=8&&(o=o.next(()=>this.F_(e,i))),n<9&&s>=9&&(o=o.next(()=>{(function(c){c.objectStoreNames.contains("remoteDocumentChanges")&&c.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&s>=10&&(o=o.next(()=>this.O_(i))),n<11&&s>=11&&(o=o.next(()=>{(function(c){c.createObjectStore(Su,{keyPath:EA})})(e),function(c){c.createObjectStore(Ou,{keyPath:_A})}(e)})),n<12&&s>=12&&(o=o.next(()=>{(function(c){const B=c.createObjectStore(Nu,{keyPath:vA});B.createIndex(pB,RA,{unique:!1}),B.createIndex(lm,bA,{unique:!1})})(e)})),n<13&&s>=13&&(o=o.next(()=>function(c){const B=c.createObjectStore(qa,{keyPath:lA});B.createIndex(ya,hA),B.createIndex(am,dA)}(e)).next(()=>this.M_(e,i)).next(()=>e.deleteObjectStore(wr))),n<14&&s>=14&&(o=o.next(()=>this.N_(e,i))),n<15&&s>=15&&(o=o.next(()=>function(c){c.createObjectStore(wl,{keyPath:DA,autoIncrement:!0}).createIndex(CB,IA,{unique:!1}),c.createObjectStore(qi,{keyPath:yA}).createIndex(cm,wA,{unique:!1}),c.createObjectStore(Ji,{keyPath:TA}).createIndex(Bm,AA,{unique:!1})}(e))),n<16&&s>=16&&(o=o.next(()=>{t.objectStore(qi).clear()}).next(()=>{t.objectStore(Ji).clear()})),n<17&&s>=17&&(o=o.next(()=>{(function(c){c.createObjectStore(Tl,{keyPath:PA})})(e)})),n<18&&s>=18&&cp()&&(o=o.next(()=>{t.objectStore(qi).clear()}).next(()=>{t.objectStore(Ji).clear()})),o}x_(e){let t=0;return e.store(wr).jn((n,s)=>{t+=Ka(s)}).next(()=>{const n={byteSize:t};return e.store(ho).put(fB,n)})}D_(e){const t=e.store(lo),n=e.store(Lt);return t.Kn().next(s=>b.forEach(s,i=>{const o=IDBKeyRange.bound([i.userId,Fr],[i.userId,i.lastAcknowledgedBatchId]);return n.Kn(Or,o).next(a=>b.forEach(a,c=>{H(c.userId===i.userId,18650,"Cannot process batch from unexpected user",{batchId:c.batchId});const B=vr(this.serializer,c);return pm(e,i.userId,B).next(()=>{})}))}))}C_(e){const t=e.store(Ms),n=e.store(wr);return e.store(Vr).get(Ja).next(s=>{const i=[];return n.jn((o,a)=>{const c=new ue(o),B=function(d){return[0,et(d)]}(c);i.push(t.get(B).next(h=>h?b.resolve():(d=>t.put({targetId:0,path:et(d),sequenceNumber:s.highestListenSequenceNumber}))(c)))}).next(()=>b.waitFor(i))})}F_(e,t){e.createObjectStore(fo,{keyPath:gA});const n=t.store(fo),s=new bl,i=o=>{if(s.add(o)){const a=o.lastSegment(),c=o.popLast();return n.put({collectionId:a,parent:et(c)})}};return t.store(wr).jn({zn:!0},(o,a)=>{const c=new ue(o);return i(c.popLast())}).next(()=>t.store(Vs).jn({zn:!0},([o,a,c],B)=>{const h=$t(a);return i(h.popLast())}))}O_(e){const t=e.store(ks);return t.jn((n,s)=>{const i=Ni(this.serializer,s),o=mm(this.serializer,i);return t.put(o)})}M_(e,t){const n=t.store(wr),s=[];return n.jn((i,o)=>{const a=t.store(qa),c=function(d){return d.document?new q(ue.fromString(d.document.name).popFirst(5)):d.noDocument?q.fromSegments(d.noDocument.path):d.unknownDocument?q.fromSegments(d.unknownDocument.path):$(36783)}(o).path.toArray(),B={prefixPath:c.slice(0,c.length-2),collectionGroup:c[c.length-2],documentId:c[c.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};s.push(a.put(B))}).next(()=>b.waitFor(s))}N_(e,t){const n=t.store(Lt),s=vm(this.serializer),i=new Sl(Vu.w_,this.serializer.qr);return n.Kn().next(o=>{const a=new Map;return o.forEach(c=>{let B=a.get(c.userId)??ie();vr(this.serializer,c).keys().forEach(h=>B=B.add(h)),a.set(c.userId,B)}),b.forEach(a,(c,B)=>{const h=new qe(B),d=Lu.Kr(this.serializer,h),C=i.getIndexManager(h),I=Fu.Kr(h,this.serializer,C,i.referenceDelegate);return new Rm(s,I,d,C).recalculateAndSaveOverlaysForDocumentKeys(new gB(t,lt.yn),c).next()})})}}function aC(r){r.createObjectStore(Ms,{keyPath:CA}).createIndex(yl,pA,{unique:!0}),r.createObjectStore(ks,{keyPath:"targetId"}).createIndex(um,fA,{unique:!0}),r.createObjectStore(Vr)}const Ln="IndexedDbPersistence",Sc=18e5,Oc=5e3,Nc="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",ov="main";class Ol{constructor(e,t,n,s,i,o,a,c,B,h,d=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.xt=i,this.window=o,this.document=a,this.L_=B,this.B_=h,this.U_=d,this.P_=null,this.R_=!1,this.isPrimary=!1,this.networkEnabled=!0,this.k_=null,this.inForeground=!1,this.q_=null,this.K_=null,this.Q_=Number.NEGATIVE_INFINITY,this.W_=C=>Promise.resolve(),!Ol.Je())throw new U(x.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new KA(this,s),this.G_=t+ov,this.serializer=new gm(c),this.z_=new $n(this.G_,this.U_,new iv(this.serializer)),this.I_=new VA,this.A_=new JA(this.referenceDelegate,this.serializer),this.remoteDocumentCache=vm(this.serializer),this.d_=new xA,this.window&&this.window.localStorage?this.j_=this.window.localStorage:(this.j_=null,h===!1&&Se(Ln,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.H_().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new U(x.FAILED_PRECONDITION,Nc);return this.J_(),this.Y_(),this.Z_(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.A_.getHighestSequenceNumber(e))}).then(e=>{this.P_=new lt(e,this.L_)}).then(()=>{this.R_=!0}).catch(e=>(this.z_&&this.z_.close(),Promise.reject(e)))}X_(e){return this.W_=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.z_.Ln(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.xt.enqueueAndForget(async()=>{this.started&&await this.H_()}))}H_(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>da(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.eo(e).next(t=>{t||(this.isPrimary=!1,this.xt.enqueueRetryable(()=>this.W_(!1)))})}).next(()=>this.no(e)).next(t=>this.isPrimary&&!t?this.ro(e).next(()=>!1):!!t&&this.io(e).next(()=>!0))).catch(e=>{if(dr(e))return G(Ln,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return G(Ln,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.xt.enqueueRetryable(()=>this.W_(e)),this.isPrimary=e})}eo(e){return Ti(e).get(as).next(t=>b.resolve(this.so(t)))}_o(e){return da(e).delete(this.clientId)}async oo(){if(this.isPrimary&&!this.ao(this.Q_,Sc)){this.Q_=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=Ge(t,Gs);return n.Kn().next(s=>{const i=this.uo(s,Sc),o=s.filter(a=>i.indexOf(a)===-1);return b.forEach(o,a=>n.delete(a.clientId)).next(()=>o)})}).catch(()=>[]);if(this.j_)for(const t of e)this.j_.removeItem(this.co(t.clientId))}}Z_(){this.K_=this.xt.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.H_().then(()=>this.oo()).then(()=>this.Z_()))}so(e){return!!e&&e.ownerId===this.clientId}no(e){return this.B_?b.resolve(!0):Ti(e).get(as).next(t=>{if(t!==null&&this.ao(t.leaseTimestampMs,Oc)&&!this.lo(t.ownerId)){if(this.so(t)&&this.networkEnabled)return!0;if(!this.so(t)){if(!t.allowTabSynchronization)throw new U(x.FAILED_PRECONDITION,Nc);return!1}}return!(!this.networkEnabled||!this.inForeground)||da(e).Kn().next(n=>this.uo(n,Oc).find(s=>{if(this.clientId!==s.clientId){const i=!this.networkEnabled&&s.networkEnabled,o=!this.inForeground&&s.inForeground,a=this.networkEnabled===s.networkEnabled;if(i||o&&a)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&G(Ln,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.R_=!1,this.Eo(),this.K_&&(this.K_.cancel(),this.K_=null),this.ho(),this.To(),await this.z_.runTransaction("shutdown","readwrite",[Fo,Gs],e=>{const t=new gB(e,lt.yn);return this.ro(t).next(()=>this._o(t))}),this.z_.close(),this.Po()}uo(e,t){return e.filter(n=>this.ao(n.updateTimeMs,t)&&!this.lo(n.clientId))}Ro(){return this.runTransaction("getActiveClients","readonly",e=>da(e).Kn().next(t=>this.uo(t,Sc).map(n=>n.clientId)))}get started(){return this.R_}getGlobalsCache(){return this.I_}getMutationQueue(e,t){return Fu.Kr(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.A_}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new qA(e,this.serializer.qr.databaseId)}getDocumentOverlayCache(e){return Lu.Kr(this.serializer,e)}getBundleCache(){return this.d_}runTransaction(e,t,n){G(Ln,"Starting transaction:",e);const s=t==="readonly"?"readonly":"readwrite",i=function(c){return c===18?NA:c===17?Cm:c===16?OA:c===15?Al:c===14?fm:c===13?dm:c===12?SA:c===11?hm:void $(60245)}(this.U_);let o;return this.z_.runTransaction(e,s,i,a=>(o=new gB(a,this.P_?this.P_.next():lt.yn),t==="readwrite-primary"?this.eo(o).next(c=>!!c||this.no(o)).next(c=>{if(!c)throw Se(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.xt.enqueueRetryable(()=>this.W_(!1)),new U(x.FAILED_PRECONDITION,Og);return n(o)}).next(c=>this.io(o).next(()=>c)):this.Io(o).next(()=>n(o)))).then(a=>(o.raiseOnCommittedEvent(),a))}Io(e){return Ti(e).get(as).next(t=>{if(t!==null&&this.ao(t.leaseTimestampMs,Oc)&&!this.lo(t.ownerId)&&!this.so(t)&&!(this.B_||this.allowTabSynchronization&&t.allowTabSynchronization))throw new U(x.FAILED_PRECONDITION,Nc)})}io(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Ti(e).put(as,t)}static Je(){return $n.Je()}ro(e){const t=Ti(e);return t.get(as).next(n=>this.so(n)?(G(Ln,"Releasing primary lease."),t.delete(as)):b.resolve())}ao(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Se(`Detected an update time that is in the future: ${e} > ${n}`),!1))}J_(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.q_=()=>{this.xt.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.H_()))},this.document.addEventListener("visibilitychange",this.q_),this.inForeground=this.document.visibilityState==="visible")}ho(){this.q_&&(this.document.removeEventListener("visibilitychange",this.q_),this.q_=null)}Y_(){typeof this.window?.addEventListener=="function"&&(this.k_=()=>{this.Eo();const e=/(?:Version|Mobile)\/1[456]/;up()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.xt.enterRestrictedMode(!0),this.xt.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.k_))}To(){this.k_&&(this.window.removeEventListener("pagehide",this.k_),this.k_=null)}lo(e){try{const t=this.j_?.getItem(this.co(e))!==null;return G(Ln,`Client '${e}' ${t?"is":"is not"} zombied in LocalStorage`),t}catch(t){return Se(Ln,"Failed to get zombied client id.",t),!1}}Eo(){if(this.j_)try{this.j_.setItem(this.co(this.clientId),String(Date.now()))}catch(e){Se("Failed to set zombie client id.",e)}}Po(){if(this.j_)try{this.j_.removeItem(this.co(this.clientId))}catch{}}co(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Ti(r){return Ge(r,Fo)}function da(r){return Ge(r,Gs)}function bm(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nl{constructor(e,t,n,s){this.targetId=e,this.fromCache=t,this.Ao=n,this.Vo=s}static fo(e,t){let n=ie(),s=ie();for(const i of t.docChanges)switch(i.type){case 0:n=n.add(i.doc.key);break;case 1:s=s.add(i.doc.key)}return new Nl(e,t.fromCache,n,s)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function av(r,e){return q.comparator(r.key,e.key)}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uv{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pm{constructor(){this.mo=!1,this.po=!1,this.yo=100,this.wo=function(){return up()?8:Fg(Me())>0?6:4}()}initialize(e,t){this.bo=e,this.indexManager=t,this.mo=!0}getDocumentsMatchingQuery(e,t,n,s){const i={result:null};return this.So(e,t).next(o=>{i.result=o}).next(()=>{if(!i.result)return this.vo(e,t,s,n).next(o=>{i.result=o})}).next(()=>{if(i.result)return;const o=new uv;return this.Do(e,t,o).next(a=>{if(i.result=a,this.po)return this.xo(e,t,o,a.size)})}).next(()=>i.result)}xo(e,t,n,s){return Pe(t)?b.resolve():n.documentReadCount<this.yo?(Cs()<=Be.DEBUG&&G("QueryEngine","SDK will not create cache indexes for query:",Mi(t),"since it only creates cache indexes for collection contains","more than or equal to",this.yo,"documents"),b.resolve()):(Cs()<=Be.DEBUG&&G("QueryEngine","Query:",Mi(t),"scans",n.documentReadCount,"local documents and returns",s,"documents as results."),n.documentReadCount>this.wo*s?(Cs()<=Be.DEBUG&&G("QueryEngine","The SDK decides to create cache indexes for query:",Mi(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,yt(t))):b.resolve())}So(e,t){if(Pe(t))return b.resolve(null);let n=t;if(If(n))return b.resolve(null);let s=yt(n);return this.indexManager.getIndexType(e,s).next(i=>i===0?null:(n.limit!==null&&i===1&&(n=uB(n,null,"F"),s=yt(n)),this.indexManager.getDocumentsMatchingTarget(e,s).next(o=>{const a=ie(...o);return this.bo.getDocuments(e,a).next(c=>this.indexManager.getMinOffset(e,s).next(B=>{const h=this.Co(n,c);return this.Fo(n,h,a,B.readTime)?this.So(e,uB(n,null,"F")):this.Oo(e,h,n,B)}))})))}vo(e,t,n,s){return(Pe(t)?function(o){for(const a of o.stages){if(a instanceof sr||a instanceof Mf)return!1;if(a instanceof So){if(a.condition instanceof zg&&a.condition._expr.name==="exists"&&a.condition._expr.params[0]instanceof Zr&&a.condition._expr.params[0].fieldName===Jt)continue;return!1}}return!0}(t):If(t))||s.isEqual(X.min())?b.resolve(null):this.bo.getDocuments(e,n).next(i=>{const o=this.Co(t,i);return this.Fo(t,o,n,s)?b.resolve(null):(Cs()<=Be.DEBUG&&G("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Gf(t)),this.Oo(e,o,t,rg(s,Ls)).next(a=>a))})}Co(e,t){let n,s;return Pe(e)?(n=new pe(av),s=i=>xu(e,i)):(n=new pe(el(e)),s=i=>_u(e,i)),t.forEach((i,o)=>{s(o)&&(n=n.add(o))}),n}Fo(e,t,n,s){if(Pe(e))return function(a){return a.stages.some(c=>c instanceof sr||c instanceof Mf)}(e);if(e.limit===null)return!1;if(n.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(s)>0)}Do(e,t,n){return Cs()<=Be.DEBUG&&G("QueryEngine","Using full collection scan to execute query:",Gf(t)),this.bo.getDocumentsMatchingQuery(e,t,Tt.min(),n)}Oo(e,t,n,s){return this.bo.getDocumentsMatchingQuery(e,n,s).next(i=>(t.forEach(o=>{i=i.insert(o.key,o)}),i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fl="LocalStore",cv=3e8;class Bv{constructor(e,t,n,s){this.persistence=e,this.Mo=t,this.serializer=s,this.No=new _e(se),this.Lo=new In(i=>Pu(i),_l),this.Bo=new Map,this.Uo=e.getRemoteDocumentCache(),this.A_=e.getTargetCache(),this.d_=e.getBundleCache(),this.ko(n)}ko(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Rm(this.Uo,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Uo.setIndexManager(this.indexManager),this.Mo.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.No))}}function Sm(r,e,t,n){return new Bv(r,e,t,n)}async function Om(r,e){const t=Q(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let s;return t.mutationQueue.getAllMutationBatches(n).next(i=>(s=i,t.ko(e),t.mutationQueue.getAllMutationBatches(n))).next(i=>{const o=[],a=[];let c=ie();for(const B of s){o.push(B.batchId);for(const h of B.mutations)c=c.add(h.key)}for(const B of i){a.push(B.batchId);for(const h of B.mutations)c=c.add(h.key)}return t.localDocuments.getDocuments(n,c).next(B=>({qo:B,removedBatchIds:o,addedBatchIds:a}))})})}function lv(r,e){const t=Q(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const s=e.batch.keys(),i=t.Uo.newChangeBuffer({trackRemovals:!0});return function(a,c,B,h){const d=B.batch,C=d.keys();let I=b.resolve();return C.forEach(R=>{I=I.next(()=>h.getEntry(c,R)).next(N=>{const M=B.docVersions.get(R);H(M!==null,48541),N.version.compareTo(M)<0&&(d.applyToRemoteDocument(N,B),N.isValidDocument()&&(N.setReadTime(B.commitVersion),h.addEntry(N)))})}),I.next(()=>a.mutationQueue.removeMutationBatch(c,d))}(t,n,e,i).next(()=>i.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,s,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(a){let c=ie();for(let B=0;B<a.mutationResults.length;++B)a.mutationResults[B].transformResults.length>0&&(c=c.add(a.batch.mutations[B].key));return c}(e))).next(()=>t.localDocuments.getDocuments(n,s))})}function Nm(r){const e=Q(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.A_.getLastRemoteSnapshotVersion(t))}function hv(r,e){const t=Q(r),n=e.snapshotVersion;let s=t.No;return t.persistence.runTransaction("Apply remote event","readwrite-primary",i=>{const o=t.Uo.newChangeBuffer({trackRemovals:!0});s=t.No;const a=[];e.targetChanges.forEach((h,d)=>{const C=s.get(d);if(!C)return;a.push(t.A_.removeMatchingKeys(i,h.removedDocuments,d).next(()=>t.A_.addMatchingKeys(i,h.addedDocuments,d)));let I=C.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(d)!==null?I=I.withResumeToken(Ae.EMPTY_BYTE_STRING,X.min()).withLastLimboFreeSnapshotVersion(X.min()):h.resumeToken.approximateByteSize()>0&&(I=I.withResumeToken(h.resumeToken,n)),s=s.insert(d,I),function(N,M,K){return N.resumeToken.approximateByteSize()===0||M.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=cv?!0:K.addedDocuments.size+K.modifiedDocuments.size+K.removedDocuments.size>0}(C,I,h)&&a.push(t.A_.updateTargetData(i,I))});let c=Ve(),B=ie();if(e.documentUpdates.forEach(h=>{e.resolvedLimboDocuments.has(h)&&a.push(t.persistence.referenceDelegate.updateLimboDocument(i,h))}),a.push(dv(i,o,e.documentUpdates).next(h=>{c=h.$o,B=h.Ko})),!n.isEqual(X.min())){const h=t.A_.getLastRemoteSnapshotVersion(i).next(d=>t.A_.setTargetsMetadata(i,i.currentSequenceNumber,n));a.push(h)}return b.waitFor(a).next(()=>o.apply(i)).next(()=>t.localDocuments.getLocalViewOfDocuments(i,c,B)).next(()=>c)}).then(i=>(t.No=s,i))}function dv(r,e,t){let n=ie(),s=ie();return t.forEach(i=>n=n.add(i)),e.getEntries(r,n).next(i=>{let o=Ve();return t.forEach((a,c)=>{const B=i.get(a);c.isFoundDocument()!==B.isFoundDocument()&&(s=s.add(a)),c.isNoDocument()&&c.version.isEqual(X.min())?(e.removeEntry(a,c.readTime),o=o.insert(a,c)):!B.isValidDocument()||c.version.compareTo(B.version)>0||c.version.compareTo(B.version)===0&&B.hasPendingWrites?(e.addEntry(c),o=o.insert(a,c)):G(Fl,"Ignoring outdated watch update for ",a,". Current version:",B.version," Watch version:",c.version)}),{$o:o,Ko:s}})}function fv(r,e){const t=Q(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=Fr),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function Wa(r,e){const t=Q(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let s;return t.A_.getTargetData(n,e).next(i=>i?(s=i,b.resolve(s)):t.A_.allocateTargetId(n).next(o=>(s=new Qt(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.A_.addTargetData(n,s).next(()=>s))))}).then(n=>{const s=t.No.get(n.targetId);return(s===null||n.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.No=t.No.insert(n.targetId,n),t.Lo.set(e,n.targetId)),n})}async function Us(r,e,t){const n=Q(r),s=n.No.get(e),i=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",i,o=>n.persistence.referenceDelegate.removeTarget(o,s))}catch(o){if(!dr(o))throw o;G(Fl,`Failed to update sequence numbers for target ${e}: ${o}`)}n.No=n.No.remove(e),n.Lo.delete(s.target)}function yB(r,e,t){const n=Q(r);let s=X.min(),i=ie();return n.persistence.runTransaction("Execute query","readwrite",o=>function(c,B,h){const d=Q(c),C=d.Lo.get(h);return C!==void 0?b.resolve(d.No.get(C)):d.A_.getTargetData(B,h)}(n,o,Pe(e)?e:yt(e)).next(a=>{if(a)return s=a.lastLimboFreeSnapshotVersion,n.A_.getMatchingKeysForTargetId(o,a.targetId).next(c=>{i=c})}).next(()=>n.Mo.getDocumentsMatchingQuery(o,e,t?s:X.min(),t?i:ie())).next(a=>(Lm(n,a),{documents:a,Qo:i})))}function Fm(r,e){const t=Q(r),n=Q(t.A_),s=t.No.get(e);return s?Promise.resolve(s.target??null):t.persistence.runTransaction("Get target data","readonly",i=>n.ge(i,e).next(o=>o?.target??null))}function wB(r,e){const t=Q(r),n=t.Bo.get(e)||X.min();return t.persistence.runTransaction("Get new document changes","readonly",s=>t.Uo.getAllFromCollectionGroup(s,e,rg(n,Ls),Number.MAX_SAFE_INTEGER)).then(s=>(Lm(t,s),s))}function Lm(r,e){e.forEach((t,n)=>{const s=n.key.getCollectionGroup(),i=r.Bo.get(s)||X.min();n.readTime.compareTo(i)>0&&r.Bo.set(s,n.readTime)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cv{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.Jo=0,this.Yo=null,this.Zo=!0}Xo(){this.Jo===0&&(this.ea("Unknown"),this.Yo=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.Yo=null,this.ta("Backend didn't respond within 10 seconds."),this.ea("Offline"),Promise.resolve())))}na(e){this.state==="Online"?this.ea("Unknown"):(this.Jo++,this.Jo>=1&&(this.ra(),this.ta(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ea("Offline")))}set(e){this.ra(),this.Jo=0,e==="Online"&&(this.Zo=!1),this.ea(e)}ea(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}ta(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.Zo?(Se(t),this.Zo=!1):G("OnlineStateTracker",t)}ra(){this.Yo!==null&&(this.Yo.cancel(),this.Yo=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sn="RemoteStore";class pv{constructor(e,t,n,s,i){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.ia=[],this.sa=new Map,this._a=new Map,this.oa=new Map,this.aa=new En(1e3),this.ua=new En(1001),this.ca=new Set,this.la=[],this.Ea=i,this.Ea.Ke(o=>{n.enqueueAndForget(async()=>{ts(this)&&(G(sn,"Restarting streams for network reachability change."),await async function(c){const B=Q(c);B.ca.add(4),await Lo(B),B.ha.set("Unknown"),B.ca.delete(4),await ku(B)}(this))})}),this.ha=new Cv(n,s)}}async function ku(r){if(ts(r))for(const e of r.la)await e(!0)}async function Lo(r){for(const e of r.la)await e(!1)}function TB(r,e){return r._a.get(e)||void 0}function Mu(r,e){const t=Q(r),n=TB(t,e.targetId);if(n!==void 0&&t.sa.has(n))return;const s=function(a,c){const B=TB(a,c);B!==void 0&&a.oa.delete(B);const h=function(C,I){return I%2!=0?C.ua.next():C.aa.next()}(a,c);return a._a.set(c,h),a.oa.set(h,c),h}(t,e.targetId);G(sn,"remoteStoreListen mapping SDK target ID to remote",e.targetId,s);const i=new Qt(e.target,s,e.purpose,e.sequenceNumber,e.snapshotVersion,e.lastLimboFreeSnapshotVersion,e.resumeToken);t.sa.set(s,i),Vl(t)?xl(t):ei(t).Jt()&&Ll(t,i)}function Hs(r,e){const t=Q(r),n=ei(t),s=TB(t,e);G(sn,"remoteStoreUnlisten removing mapping of SDK target ID to remote",e,s),t.sa.delete(s),t._a.delete(e),t.oa.delete(s),n.Jt()&&xm(t,s),t.sa.size===0&&(n.Jt()?n.Xt():ts(t)&&t.ha.set("Unknown"))}function Ll(r,e){if(r.Ta.H(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(X.min())>0){const t=r.oa.get(e.targetId);if(t===void 0)return void G(sn,"SDK target ID not found for remote ID: "+e.targetId);const n=r.remoteSyncer.getRemoteKeysForTarget(t).size;e=e.withExpectedCount(n)}ei(r).Tn(e)}function xm(r,e){r.Ta.H(e),ei(r).Pn(e)}function xl(r){r.Ta=new Jy({getRemoteKeysForTarget:e=>{const t=r.oa.get(e);return t!==void 0?r.remoteSyncer.getRemoteKeysForTarget(t):ie()},ge:e=>r.sa.get(e)||null,Ae:()=>r.datastore.serializer.databaseId}),ei(r).start(),r.ha.Xo()}function Vl(r){return ts(r)&&!ei(r).Ht()&&r.sa.size>0}function ts(r){return Q(r).ca.size===0}function Vm(r){r.Ta=void 0}async function gv(r){r.ha.set("Online")}async function mv(r){r.sa.forEach((e,t)=>{Ll(r,e)})}async function Ev(r,e){Vm(r),Vl(r)?(r.ha.na(e),xl(r)):r.ha.set("Unknown")}async function _v(r,e,t){if(r.ha.set("Online"),e instanceof hg&&e.state===2&&e.cause)try{await async function(s,i){const o=i.cause;for(const a of i.targetIds){if(s.sa.has(a)){const c=s.oa.get(a);c!==void 0&&(await s.remoteSyncer.rejectListen(c,o),s._a.delete(c),s.oa.delete(a)),s.sa.delete(a)}s.Ta.removeTarget(a)}}(r,e)}catch(n){G(sn,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await Ya(r,n)}else if(e instanceof Ea?r.Ta.se(e):e instanceof lg?r.Ta.Ee(e):r.Ta.ae(e),!t.isEqual(X.min()))try{const n=await Nm(r.localStore);t.compareTo(n)>=0&&await function(i,o){const a=i.Ta.de(o);a.targetChanges.forEach((B,h)=>{if(B.resumeToken.approximateByteSize()>0){const d=i.sa.get(h);d&&i.sa.set(h,d.withResumeToken(B.resumeToken,o))}}),a.targetMismatches.forEach((B,h)=>{const d=i.sa.get(B);if(!d)return;i.sa.set(B,d.withResumeToken(Ae.EMPTY_BYTE_STRING,d.snapshotVersion)),xm(i,B);const C=new Qt(d.target,B,h,d.sequenceNumber);Ll(i,C)});const c=function(h,d){const C=new Map;d.targetChanges.forEach((R,N)=>{const M=h.oa.get(N);M!==void 0&&C.set(M,R)});let I=new _e(se);return d.targetMismatches.forEach((R,N)=>{const M=h.oa.get(R);M!==void 0&&(I=I.insert(M,N))}),new Ws(d.snapshotVersion,C,I,d.documentUpdates,d.augmentedDocumentUpdates,d.resolvedLimboDocuments)}(i,a);return i.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){G(sn,"Failed to raise snapshot:",n),await Ya(r,n)}}async function Ya(r,e,t){if(!dr(e))throw e;r.ca.add(1),await Lo(r),r.ha.set("Offline"),t||(t=()=>Nm(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{G(sn,"Retrying IndexedDB access"),await t(),r.ca.delete(1),await ku(r)})}function km(r,e){return e().catch(t=>Ya(r,t,e))}async function Zs(r){const e=Q(r),t=or(e);let n=e.ia.length>0?e.ia[e.ia.length-1].batchId:Fr;for(;Dv(e);)try{const s=await fv(e.localStore,n);if(s===null){e.ia.length===0&&t.Xt();break}n=s.batchId,Iv(e,s)}catch(s){await Ya(e,s)}Mm(e)&&Gm(e)}function Dv(r){return ts(r)&&r.ia.length<10}function Iv(r,e){r.ia.push(e);const t=or(r);t.Jt()&&t.Rn&&t.In(e.mutations)}function Mm(r){return ts(r)&&!or(r).Ht()&&r.ia.length>0}function Gm(r){or(r).start()}async function yv(r){or(r).dn()}async function wv(r){const e=or(r);for(const t of r.ia)e.In(t.mutations)}async function Tv(r,e,t){const n=r.ia.shift(),s=Il.from(n,e,t);await km(r,()=>r.remoteSyncer.applySuccessfulWrite(s)),await Zs(r)}async function Av(r,e){e&&or(r).Rn&&await async function(n,s){if(function(o){return ky(o)&&o!==x.ABORTED}(s.code)){const i=n.ia.shift();or(n).Zt(),await km(n,()=>n.remoteSyncer.rejectFailedWrite(i.batchId,s)),await Zs(n)}}(r,e),Mm(r)&&Gm(r)}async function uC(r,e){const t=Q(r);t.asyncQueue.verifyOperationInProgress(),G(sn,"RemoteStore received new credentials");const n=ts(t);t.ca.add(3),await Lo(t),n&&t.ha.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.ca.delete(3),await ku(t)}async function AB(r,e){const t=Q(r);e?(t.ca.delete(2),await ku(t)):e||(t.ca.add(2),await Lo(t),t.ha.set("Unknown"))}function ei(r){return r.Pa||(r.Pa=function(t,n,s){const i=Q(t);return i.mn(),new pw(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{ut:gv.bind(null,r),lt:mv.bind(null,r),ht:Ev.bind(null,r),hn:_v.bind(null,r)}),r.la.push(async e=>{e?(r.Pa.Zt(),Vl(r)?xl(r):r.ha.set("Unknown")):(await r.Pa.stop(),Vm(r))})),r.Pa}function or(r){return r.Ra||(r.Ra=function(t,n,s){const i=Q(t);return i.mn(),new gw(n,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,s)}(r.datastore,r.asyncQueue,{ut:()=>Promise.resolve(),lt:yv.bind(null,r),ht:Av.bind(null,r),An:wv.bind(null,r),Vn:Tv.bind(null,r)}),r.la.push(async e=>{e?(r.Ra.Zt(),await Zs(r)):(await r.Ra.stop(),r.ia.length>0&&(G(sn,`Stopping write stream with ${r.ia.length} pending writes`),r.ia=[]))})),r.Ra}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kl{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ia(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ia(this.observer.error,e):Se("Uncaught Error in snapshot listener:",e.toString()))}Aa(){this.muted=!0}Ia(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ml{constructor(e,t,n,s,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=s,this.removalCallback=i,this.deferred=new Xt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,s,i){const o=Date.now()+n,a=new Ml(e,t,o,s,i);return a.start(n),a}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new U(x.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Gl(r,e){if(Se("AsyncQueue",`${e}: ${r}`),dr(r))return new U(x.UNAVAILABLE,`${e}: ${r}`);throw r}const Ki="IndexBackfiller";class vv{constructor(e,t){this.asyncQueue=e,this.va=t,this.task=null}start(){this.Da(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}Da(e){G(Ki,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.va.xa();G(Ki,`Documents written: ${t}`)}catch(t){dr(t)?G(Ki,"Ignoring IndexedDB error during index backfill: ",t):await hr(t)}await this.Da(6e4)})}}class Rv{constructor(e,t){this.localStore=e,this.persistence=t}async xa(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.Ca(t,e))}Ca(e,t){const n=new Set;let s=t,i=!0;return b.doWhile(()=>i===!0&&s>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return G(Ki,`Processing collection: ${o}`),this.Fa(e,o,s).next(a=>{s-=a,n.add(o)});i=!1})).next(()=>t-s)}Fa(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(s=>this.localStore.localDocuments.getNextDocuments(e,t,s,n).next(i=>{const o=i.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this.Oa(s,i)).next(a=>(G(Ki,`Updating offset: ${a}`),this.localStore.indexManager.updateCollectionGroup(e,t,a))).next(()=>o.size)}))}Oa(e,t){let n=e;return t.changes.forEach((s,i)=>{const o=sg(i);YB(o,n)>0&&(n=o)}),new Tt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Um="firestore_clients";function cC(r,e){return`${Um}_${r}_${e}`}const Hm="firestore_mutations";function BC(r,e,t){let n=`${Hm}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const jm="firestore_targets";function Fc(r,e){return`${jm}_${r}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qt="SharedClientState";class Xa{constructor(e,t,n,s){this.user=e,this.batchId=t,this.state=n,this.error=s}static Ma(e,t,n){const s=JSON.parse(n);let i,o=typeof s=="object"&&["pending","acknowledged","rejected"].indexOf(s.state)!==-1&&(s.error===void 0||typeof s.error=="object");return o&&s.error&&(o=typeof s.error.message=="string"&&typeof s.error.code=="string",o&&(i=new U(s.error.code,s.error.message))),o?new Xa(e,t,s.state,i):(Se(qt,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Na(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class zi{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ma(e,t){const n=JSON.parse(t);let s,i=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return i&&n.error&&(i=typeof n.error.message=="string"&&typeof n.error.code=="string",i&&(s=new U(n.error.code,n.error.message))),i?new zi(e,n.state,s):(Se(qt,`Failed to parse target state for ID '${e}': ${t}`),null)}Na(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Za{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ma(e,t){const n=JSON.parse(t);let s=typeof n=="object"&&n.activeTargetIds instanceof Array,i=tl();for(let o=0;s&&o<n.activeTargetIds.length;++o)s=kp(n.activeTargetIds[o]),i=i.add(n.activeTargetIds[o]);return s?new Za(e,i):(Se(qt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Ul{constructor(e,t){this.clientId=e,this.onlineState=t}static Ma(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Ul(t.clientId,t.onlineState):(Se(qt,`Failed to parse online state: ${e}`),null)}}class vB{constructor(){this.activeTargetIds=tl()}La(e){this.activeTargetIds=this.activeTargetIds.add(e)}Ba(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Na(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Lc{constructor(e,t,n,s,i){this.window=e,this.xt=t,this.persistenceKey=n,this.Ua=s,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.ka=this.qa.bind(this),this.$a=new _e(se),this.started=!1,this.Ka=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.Qa=cC(this.persistenceKey,this.Ua),this.Wa=function(c){return`firestore_sequence_number_${c}`}(this.persistenceKey),this.$a=this.$a.insert(this.Ua,new vB),this.Ga=new RegExp(`^${Um}_${o}_([^_]*)$`),this.za=new RegExp(`^${Hm}_${o}_(\\d+)(?:_(.*))?$`),this.ja=new RegExp(`^${jm}_${o}_(\\d+)$`),this.Ha=function(c){return`firestore_online_state_${c}`}(this.persistenceKey),this.Ja=function(c){return`firestore_bundle_loaded_v2_${c}`}(this.persistenceKey),this.window.addEventListener("storage",this.ka)}static Je(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ro();for(const n of e){if(n===this.Ua)continue;const s=this.getItem(cC(this.persistenceKey,n));if(s){const i=Za.Ma(n,s);i&&(this.$a=this.$a.insert(i.clientId,i))}}this.Ya();const t=this.storage.getItem(this.Ha);if(t){const n=this.Za(t);n&&this.Xa(n)}for(const n of this.Ka)this.qa(n);this.Ka=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Wa,JSON.stringify(e))}getAllActiveQueryTargets(){return this.eu(this.$a)}isActiveQueryTarget(e){let t=!1;return this.$a.forEach((n,s)=>{s.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.tu(e,"pending")}updateMutationState(e,t,n){this.tu(e,t,n),this.nu(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const s=this.storage.getItem(Fc(this.persistenceKey,e));if(s){const i=zi.Ma(e,s);i&&(n=i.state)}}return t&&this.ru.La(e),this.Ya(),n}removeLocalQueryTarget(e){this.ru.Ba(e),this.Ya()}isLocalQueryTarget(e){return this.ru.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Fc(this.persistenceKey,e))}updateQueryState(e,t,n){this.iu(e,t,n)}handleUserChange(e,t,n){t.forEach(s=>{this.nu(s)}),this.currentUser=e,n.forEach(s=>{this.addPendingMutation(s)})}setOnlineState(e){this.su(e)}notifyBundleLoaded(e){this._u(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.ka),this.removeItem(this.Qa),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return G(qt,"READ",e,t),t}setItem(e,t){G(qt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){G(qt,"REMOVE",e),this.storage.removeItem(e)}qa(e){const t=e;if(t.storageArea===this.storage){if(G(qt,"EVENT",t.key,t.newValue),t.key===this.Qa)return void Se("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.xt.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.Ga.test(t.key)){if(t.newValue==null){const n=this.ou(t.key);return this.au(n,null)}{const n=this.uu(t.key,t.newValue);if(n)return this.au(n.clientId,n)}}else if(this.za.test(t.key)){if(t.newValue!==null){const n=this.cu(t.key,t.newValue);if(n)return this.lu(n)}}else if(this.ja.test(t.key)){if(t.newValue!==null){const n=this.Eu(t.key,t.newValue);if(n)return this.hu(n)}}else if(t.key===this.Ha){if(t.newValue!==null){const n=this.Za(t.newValue);if(n)return this.Xa(n)}}else if(t.key===this.Wa){const n=function(i){let o=lt.yn;if(i!=null)try{const a=JSON.parse(i);H(typeof a=="number",30636,{Tu:i}),o=a}catch(a){Se(qt,"Failed to read sequence number from WebStorage",a)}return o}(t.newValue);n!==lt.yn&&this.sequenceNumberHandler(n)}else if(t.key===this.Ja){const n=this.Pu(t.newValue);await Promise.all(n.map(s=>this.syncEngine.Ru(s)))}}}else this.Ka.push(t)})}}get ru(){return this.$a.get(this.Ua)}Ya(){this.setItem(this.Qa,this.ru.Na())}tu(e,t,n){const s=new Xa(this.currentUser,e,t,n),i=BC(this.persistenceKey,this.currentUser,e);this.setItem(i,s.Na())}nu(e){const t=BC(this.persistenceKey,this.currentUser,e);this.removeItem(t)}su(e){const t={clientId:this.Ua,onlineState:e};this.storage.setItem(this.Ha,JSON.stringify(t))}iu(e,t,n){const s=Fc(this.persistenceKey,e),i=new zi(e,t,n);this.setItem(s,i.Na())}_u(e){const t=JSON.stringify(Array.from(e));this.setItem(this.Ja,t)}ou(e){const t=this.Ga.exec(e);return t?t[1]:null}uu(e,t){const n=this.ou(e);return Za.Ma(n,t)}cu(e,t){const n=this.za.exec(e),s=Number(n[1]),i=n[2]!==void 0?n[2]:null;return Xa.Ma(new qe(i),s,t)}Eu(e,t){const n=this.ja.exec(e),s=Number(n[1]);return zi.Ma(s,t)}Za(e){return Ul.Ma(e)}Pu(e){return JSON.parse(e)}async lu(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Iu(e.batchId,e.state,e.error);G(qt,`Ignoring mutation for non-active user ${e.user.uid}`)}hu(e){return this.syncEngine.Au(e.targetId,e.state,e.error)}au(e,t){const n=t?this.$a.insert(e,t):this.$a.remove(e),s=this.eu(this.$a),i=this.eu(n),o=[],a=[];return i.forEach(c=>{s.has(c)||o.push(c)}),s.forEach(c=>{i.has(c)||a.push(c)}),this.syncEngine.Vu(o,a).then(()=>{this.$a=n})}Xa(e){this.$a.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}eu(e){let t=tl();return e.forEach((n,s)=>{t=t.unionWith(s.activeTargetIds)}),t}}class qm{constructor(){this.du=new vB,this.fu={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.du.La(e),this.fu[e]||"not-current"}updateQueryState(e,t,n){this.fu[e]=t}removeLocalQueryTarget(e){this.du.Ba(e)}isLocalQueryTarget(e){return this.du.activeTargetIds.has(e)}clearQueryState(e){delete this.fu[e]}getAllActiveQueryTargets(){return this.du.activeTargetIds}isActiveQueryTarget(e){return this.du.activeTargetIds.has(e)}start(){return this.du=new vB,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jm(){return typeof window<"u"?window:null}function Ta(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kr{static emptySet(e){return new kr(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||q.comparator(t.key,n.key):(t,n)=>q.comparator(t.key,n.key),this.keyedMap=Tr(),this.sortedSet=new _e(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof kr)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,i=n.getNext().key;if(!s.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new kr;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lC{constructor(){this.mu=new _e(q.comparator)}track(e){const t=e.doc.key,n=this.mu.get(t);n?e.type!==0&&n.type===3?this.mu=this.mu.insert(t,e):e.type===3&&n.type!==1?this.mu=this.mu.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.mu=this.mu.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.mu=this.mu.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.mu=this.mu.remove(t):e.type===1&&n.type===2?this.mu=this.mu.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.mu=this.mu.insert(t,{type:2,doc:e.doc}):$(63341,{ye:e,pu:n}):this.mu=this.mu.insert(t,e)}gu(){const e=[];return this.mu.inorderTraversal((t,n)=>{e.push(n)}),e}}class js{constructor(e,t,n,s,i,o,a,c,B){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=s,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=a,this.excludesMetadataChanges=c,this.hasCachedResults=B}static fromInitialDocuments(e,t,n,s,i){const o=[];return t.forEach(a=>{o.push({type:0,doc:a})}),new js(e,t,kr.emptySet(t),o,n,s,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&bu(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==n[s].type||!t[s].doc.isEqual(n[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bv{constructor(){this.yu=void 0,this.wu=[]}bu(){return this.wu.some(e=>e.Su())}}class Pv{constructor(){this.queries=hC(),this.onlineState="Unknown",this.vu=new Set}terminate(){(function(t,n){const s=Q(t),i=s.queries;s.queries=hC(),i.forEach((o,a)=>{for(const c of a.wu)c.onError(n)})})(this,new U(x.ABORTED,"Firestore shutting down"))}}function hC(){return new In(r=>im(r),bu)}async function Hl(r,e){const t=Q(r);let n=3;const s=e.query;let i=t.queries.get(s);i?!i.bu()&&e.Su()&&(n=2):(i=new bv,n=e.Su()?0:1);try{switch(n){case 0:i.yu=await t.onListen(s,!0);break;case 1:i.yu=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(o){const a=Gl(o,`Initialization of query '${Pe(e.query)?dn(e.query):Mi(e.query)}' failed`);return void e.onError(a)}t.queries.set(s,i),i.wu.push(e),e.Du(t.onlineState),i.yu&&e.xu(i.yu)&&ql(t)}async function jl(r,e){const t=Q(r),n=e.query;let s=3;const i=t.queries.get(n);if(i){const o=i.wu.indexOf(e);o>=0&&(i.wu.splice(o,1),i.wu.length===0?s=e.Su()?0:1:!i.bu()&&e.Su()&&(s=2))}switch(s){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function Sv(r,e){const t=Q(r);let n=!1;for(const s of e){const i=s.query,o=t.queries.get(i);if(o){for(const a of o.wu)a.xu(s)&&(n=!0);o.yu=s}}n&&ql(t)}function Ov(r,e,t){const n=Q(r),s=n.queries.get(e);if(s)for(const i of s.wu)i.onError(t);n.queries.delete(e)}function ql(r){r.vu.forEach(e=>{e.next()})}var RB;(function(r){r.Default="default",r.Cache="cache"})(RB||(RB={}));class Jl{constructor(e,t,n){this.query=e,this.Cu=t,this.Fu=!1,this.Ou=null,this.onlineState="Unknown",this.options=n||{}}xu(e){if(!this.options.includeMetadataChanges){const n=[];for(const s of e.docChanges)s.type!==3&&n.push(s);e=new js(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Fu?this.Mu(e)&&(this.Cu.next(e),t=!0):this.Nu(e,this.onlineState)&&(this.Lu(e),t=!0),this.Ou=e,t}onError(e){this.Cu.error(e)}Du(e){this.onlineState=e;let t=!1;return this.Ou&&!this.Fu&&this.Nu(this.Ou,e)&&(this.Lu(this.Ou),t=!0),t}Nu(e,t){if(!e.fromCache||!this.Su())return!0;const n=t!=="Offline";return(!this.options.waitForSyncWhenOnline||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Mu(e){if(e.docChanges.length>0)return!0;const t=this.Ou&&this.Ou.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}Lu(e){e=js.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Fu=!0,this.Cu.next(e)}Su(){return this.options.source!==RB.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Km{constructor(e){this.key=e}}class zm{constructor(e){this.key=e}}class Nv{constructor(e,t){this.query=e,this.Gu=t,this.zu=null,this.hasCachedResults=!1,this.current=!1,this.ju=ie(),this.mutatedKeys=ie(),this.Hu=Pe(e)?IB(e):el(e),this.Ju=new kr(this.Hu)}get Yu(){return this.Gu}Zu(e,t){const n=t?t.Xu:new lC,s=t?t.Ju:this.Ju;let i=t?t.mutatedKeys:this.mutatedKeys,o=s,a=!1;const[c,B]=this.ec(this.query,s);e.inorderTraversal((d,C)=>{const I=s.get(d),R=Tm(this.query,C)?C:null,N=!!I&&this.mutatedKeys.has(I.key),M=!!R&&(R.hasLocalMutations||this.mutatedKeys.has(R.key)&&R.hasCommittedMutations);let K=!1;I&&R?I.data.isEqual(R.data)?N!==M&&(n.track({type:3,doc:R}),K=!0):this.tc(I,R)||(n.track({type:2,doc:R}),K=!0,(c&&this.Hu(R,c)>0||B&&this.Hu(R,B)<0)&&(a=!0)):!I&&R?(n.track({type:0,doc:R}),K=!0):I&&!R&&(n.track({type:1,doc:I}),K=!0,(c||B)&&(a=!0)),K&&(R?(o=o.add(R),i=M?i.add(d):i.delete(d)):(o=o.delete(d),i=i.delete(d)))});const h=this.nc(this.query);if(h)if(Pe(this.query)){const d=[];o.forEach(R=>d.push(R));const C=wm(this.query,d);let I=new kr(IB(this.query));for(const R of C)I=I.add(R);o.forEach(R=>{I.has(R.key)||(i=i.delete(R.key),n.track({type:1,doc:R}))}),o=I}else{const d=this.rc(this.query);for(;o.size>h;){const C=d==="F"?o.last():o.first();o=o.delete(C.key),i=i.delete(C.key),n.track({type:1,doc:C})}}return{Ju:o,Xu:n,Fo:a,mutatedKeys:i}}nc(e){return Pe(e)?Pc(e)?.limit:e.limit||void 0}rc(e){if(Pe(e)){const t=Pc(e);return t&&t.limit<0?"L":"F"}return e.limitType}ec(e,t){if(Pe(e)){const n=Pc(e)?.limit;return[t.size===n?t.last():null,null]}return[e.limitType==="F"&&t.size===this.nc(this.query)?t.last():null,e.limitType==="L"&&t.size===this.nc(this.query)?t.first():null]}tc(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,s){const i=this.Ju;this.Ju=e.Ju,this.mutatedKeys=e.mutatedKeys;const o=e.Xu.gu();o.sort((h,d)=>function(I,R){const N=M=>{switch(M){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return $(20277,{ye:M})}};return N(I)-N(R)}(h.type,d.type)||this.Hu(h.doc,d.doc)),this.sc(n),s=s??!1;const a=t&&!s?this._c():[],c=this.ju.size===0&&this.current&&!s?1:0,B=c!==this.zu;return this.zu=c,o.length!==0||B?{snapshot:new js(this.query,e.Ju,i,o,e.mutatedKeys,c===0,B,!1,!!n&&n.resumeToken.approximateByteSize()>0),oc:a}:{oc:a}}Du(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Ju:this.Ju,Xu:new lC,mutatedKeys:this.mutatedKeys,Fo:!1},!1)):{oc:[]}}ac(e){return!this.Gu.has(e)&&!!this.Ju.has(e)&&!this.Ju.get(e).hasLocalMutations}sc(e){e&&(e.addedDocuments.forEach(t=>this.Gu=this.Gu.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Gu=this.Gu.delete(t)),this.current=e.current)}_c(){if(!this.current)return[];const e=this.ju;this.ju=ie(),this.Ju.forEach(n=>{this.ac(n.key)&&(this.ju=this.ju.add(n.key))});const t=[];return e.forEach(n=>{this.ju.has(n)||t.push(new zm(n))}),this.ju.forEach(n=>{e.has(n)||t.push(new Km(n))}),t}uc(e){this.Gu=e.Qo,this.ju=ie();const t=this.Zu(e.documents);return this.applyChanges(t,!0)}cc(){return js.fromInitialDocuments(this.query,this.Ju,this.mutatedKeys,this.zu===0,this.hasCachedResults)}}const ti="SyncEngine";class Fv{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class Lv{constructor(e){this.key=e,this.lc=!1}}class xv{constructor(e,t,n,s,i,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=s,this.currentUser=i,this.maxConcurrentLimboResolutions=o,this.Ec={},this.hc=new In(a=>im(a),bu),this.Tc=new Map,this.Pc=new Set,this.Rc=new _e(q.comparator),this.Ic=new Map,this.Ac=new Pl,this.Vc={},this.dc=new Map,this.fc=En.ws(),this.onlineState="Unknown",this.mc=void 0}get isPrimaryClient(){return this.mc===!0}}async function Vv(r,e,t=!0){const n=Gu(r);let s;const i=n.hc.get(e);return i?(n.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.cc()):s=await $m(n,e,t,!0),s}async function kv(r,e){const t=Gu(r);await $m(t,e,!0,!1)}async function $m(r,e,t,n){const s=await Wa(r.localStore,Pe(e)?e:yt(e)),i=s.targetId,o=r.sharedClientState.addLocalQueryTarget(i,t);let a;return n&&(a=await Kl(r,e,i,o==="current",s.resumeToken)),r.isPrimaryClient&&t&&Mu(r.remoteStore,s),a}async function Kl(r,e,t,n,s){r.gc=(d,C,I)=>async function(N,M,K,Z){let te=M.view.Zu(K);te.Fo&&(te=await yB(N.localStore,M.query,!1).then(({documents:y})=>M.view.Zu(y,te)));const ce=Z&&Z.targetChanges.get(M.targetId),fe=Z&&Z.targetMismatches.get(M.targetId)!=null,oe=M.view.applyChanges(te,N.isPrimaryClient,ce,fe);return bB(N,M.targetId,oe.oc),oe.snapshot}(r,d,C,I);const i=await yB(r.localStore,e,!0),o=new Nv(e,i.Qo),a=o.Zu(i.documents),c=Ro.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",s),B=o.applyChanges(a,r.isPrimaryClient,c);bB(r,t,B.oc);const h=new Fv(e,t,o);return r.hc.set(e,h),r.Tc.has(t)?r.Tc.get(t).push(e):r.Tc.set(t,[e]),B.snapshot}async function Mv(r,e,t){const n=Q(r),s=n.hc.get(e),i=n.Tc.get(s.targetId);if(i.length>1)return n.Tc.set(s.targetId,i.filter(o=>!bu(o,e))),void n.hc.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(s.targetId),n.sharedClientState.isActiveQueryTarget(s.targetId)||await Us(n.localStore,s.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(s.targetId),t&&Hs(n.remoteStore,s.targetId),qs(n,s.targetId)}).catch(hr)):(qs(n,s.targetId),await Us(n.localStore,s.targetId,!0))}async function Gv(r,e){const t=Q(r),n=t.hc.get(e),s=t.Tc.get(n.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Hs(t.remoteStore,n.targetId))}async function Uv(r,e,t){const n=Wl(r);try{const s=await function(o,a){const c=Q(o),B=ge.now(),h=a.reduce((I,R)=>I.add(R.key),ie());let d,C;return c.persistence.runTransaction("Locally write mutations","readwrite",I=>{let R=Ve(),N=ie();return c.Uo.getEntries(I,h).next(M=>{R=M,R.forEach((K,Z)=>{Z.isValidDocument()||(N=N.add(K))})}).next(()=>c.localDocuments.getOverlayedDocuments(I,R)).next(M=>{d=M;const K=[];for(const Z of a){const te=wy(Z,d.get(Z.key).overlayedDocument);te!=null&&K.push(new Dn(Z.key,te,Hp(te.value.mapValue),ot.exists(!0)))}return c.mutationQueue.addMutationBatch(I,B,K,a)}).next(M=>{C=M;const K=M.applyToLocalDocumentSet(d,N);return c.documentOverlayCache.saveOverlays(I,M.batchId,K)})}).then(()=>({batchId:C.batchId,changes:cg(d)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(s.batchId),function(o,a,c){let B=o.Vc[o.currentUser.toKey()];B||(B=new _e(se)),B=B.insert(a,c),o.Vc[o.currentUser.toKey()]=B}(n,s.batchId,t),await fr(n,s.changes),await Zs(n.remoteStore)}catch(s){const i=Gl(s,"Failed to persist write");t.reject(i)}}async function Qm(r,e){const t=Q(r);try{const n=await hv(t.localStore,e);e.targetChanges.forEach((s,i)=>{const o=t.Ic.get(i);o&&(H(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1,22616),s.addedDocuments.size>0?o.lc=!0:s.modifiedDocuments.size>0?H(o.lc,14607):s.removedDocuments.size>0&&(H(o.lc,42227),o.lc=!1))}),await fr(t,n,e)}catch(n){await hr(n)}}function dC(r,e,t){const n=Q(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const s=[];n.hc.forEach((i,o)=>{const a=o.view.Du(e);a.snapshot&&s.push(a.snapshot)}),function(o,a){const c=Q(o);c.onlineState=a;let B=!1;c.queries.forEach((h,d)=>{for(const C of d.wu)C.Du(a)&&(B=!0)}),B&&ql(c)}(n.eventManager,e),s.length&&n.Ec.hn(s),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function Hv(r,e,t){const n=Q(r);n.sharedClientState.updateQueryState(e,"rejected",t);const s=n.Ic.get(e),i=s&&s.key;if(i){let o=new _e(q.comparator);o=o.insert(i,be.newNoDocument(i,X.min()));const a=ie().add(i),c=new Ws(X.min(),new Map,new _e(se),o,Ve(),a);await Qm(n,c),n.Rc=n.Rc.remove(i),n.Ic.delete(e),Ql(n)}else await Us(n.localStore,e,!1).then(()=>qs(n,e,t)).catch(hr)}async function jv(r,e){const t=Q(r),n=e.batch.batchId;try{const s=await lv(t.localStore,e);$l(t,n,null),zl(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await fr(t,s)}catch(s){await hr(s)}}async function qv(r,e,t){const n=Q(r);try{const s=await function(o,a){const c=Q(o);return c.persistence.runTransaction("Reject batch","readwrite-primary",B=>{let h;return c.mutationQueue.lookupMutationBatch(B,a).next(d=>(H(d!==null,37113),h=d.keys(),c.mutationQueue.removeMutationBatch(B,d))).next(()=>c.mutationQueue.performConsistencyCheck(B)).next(()=>c.documentOverlayCache.removeOverlaysForBatchId(B,h,a)).next(()=>c.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(B,h)).next(()=>c.localDocuments.getDocuments(B,h))})}(n.localStore,e);$l(n,e,t),zl(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await fr(n,s)}catch(s){await hr(s)}}function zl(r,e){(r.dc.get(e)||[]).forEach(t=>{t.resolve()}),r.dc.delete(e)}function $l(r,e,t){const n=Q(r);let s=n.Vc[n.currentUser.toKey()];if(s){const i=s.get(e);i&&(t?i.reject(t):i.resolve(),s=s.remove(e)),n.Vc[n.currentUser.toKey()]=s}}function qs(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Tc.get(e))r.hc.delete(n),t&&r.Ec.yc(n,t);r.Tc.delete(e),r.isPrimaryClient&&r.Ac.Xs(e).forEach(n=>{r.Ac.containsKey(n)||Wm(r,n)})}function Wm(r,e){r.Pc.delete(e.path.canonicalString());const t=r.Rc.get(e);t!==null&&(Hs(r.remoteStore,t),r.Rc=r.Rc.remove(e),r.Ic.delete(t),Ql(r))}function bB(r,e,t){for(const n of t)n instanceof Km?(r.Ac.addReference(n.key,e),Jv(r,n)):n instanceof zm?(G(ti,"Document no longer in limbo: "+n.key),r.Ac.removeReference(n.key,e),r.Ac.containsKey(n.key)||Wm(r,n.key)):$(19791,{wc:n})}function Jv(r,e){const t=e.key,n=t.path.canonicalString();r.Rc.get(t)||r.Pc.has(n)||(G(ti,"New document in limbo: "+t),r.Pc.add(n),Ql(r))}function Ql(r){for(;r.Pc.size>0&&r.Rc.size<r.maxConcurrentLimboResolutions;){const e=r.Pc.values().next().value;r.Pc.delete(e);const t=new q(ue.fromString(e)),n=r.fc.next();r.Ic.set(n,new Lv(t)),r.Rc=r.Rc.insert(t,n),Mu(r.remoteStore,new Qt(yt(vo(t.path)),n,"TargetPurposeLimboResolution",lt.yn))}}async function fr(r,e,t){const n=Q(r),s=[],i=[],o=[];n.hc.isEmpty()||(n.hc.forEach((a,c)=>{o.push(n.gc(c,e,t).then(B=>{if((B||t)&&n.isPrimaryClient){const h=B?!B.fromCache:t?.targetChanges.get(c.targetId)?.current;n.sharedClientState.updateQueryState(c.targetId,h?"current":"not-current")}if(B){s.push(B);const h=Nl.fo(c.targetId,B);i.push(h)}}))}),await Promise.all(o),n.Ec.hn(s),await async function(c,B){const h=Q(c);try{await h.persistence.runTransaction("notifyLocalViewChanges","readwrite",d=>b.forEach(B,C=>b.forEach(C.Ao,I=>h.persistence.referenceDelegate.addReference(d,C.targetId,I)).next(()=>b.forEach(C.Vo,I=>h.persistence.referenceDelegate.removeReference(d,C.targetId,I)))))}catch(d){if(!dr(d))throw d;G(Fl,"Failed to update sequence numbers: "+d)}for(const d of B){const C=d.targetId;if(!d.fromCache){const I=h.No.get(C),R=I.snapshotVersion,N=I.withLastLimboFreeSnapshotVersion(R);h.No=h.No.insert(C,N)}}}(n.localStore,i))}async function Kv(r,e){const t=Q(r);if(!t.currentUser.isEqual(e)){G(ti,"User change. New user:",e.toKey());const n=await Om(t.localStore,e);t.currentUser=e,function(i,o){i.dc.forEach(a=>{a.forEach(c=>{c.reject(new U(x.CANCELLED,o))})}),i.dc.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await fr(t,n.qo)}}function zv(r,e){const t=Q(r),n=t.Ic.get(e);if(n&&n.lc)return ie().add(n.key);{let s=ie();const i=t.Tc.get(e);if(!i)return s;for(const o of i??[]){const a=t.hc.get(o);s=s.unionWith(a.view.Yu)}return s}}async function $v(r,e){const t=Q(r),n=await yB(t.localStore,e.query,!0),s=e.view.uc(n);return t.isPrimaryClient&&bB(t,e.targetId,s.oc),s}async function Qv(r,e){const t=Q(r);return wB(t.localStore,e).then(n=>fr(t,n))}async function Wv(r,e,t,n){const s=Q(r),i=await function(a,c){const B=Q(a),h=Q(B.mutationQueue);return B.persistence.runTransaction("Lookup mutation documents","readonly",d=>h.Qr(d,c).next(C=>C?B.localDocuments.getDocuments(d,C):b.resolve(null)))}(s.localStore,e);i!==null?(t==="pending"?await Zs(s.remoteStore):t==="acknowledged"||t==="rejected"?($l(s,e,n||null),zl(s,e),function(a,c){Q(Q(a).mutationQueue).jr(c)}(s.localStore,e)):$(6720,"Unknown batchState",{bc:t}),await fr(s,i)):G(ti,"Cannot apply mutation batch with id: "+e)}async function Yv(r,e){const t=Q(r);if(Gu(t),Wl(t),e===!0&&t.mc!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),s=await fC(t,n.toArray());t.mc=!0,await AB(t.remoteStore,!0);for(const i of s)Mu(t.remoteStore,i)}else if(e===!1&&t.mc!==!1){const n=[];let s=Promise.resolve();t.Tc.forEach((i,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):s=s.then(()=>(qs(t,o),Us(t.localStore,o,!0))),Hs(t.remoteStore,o)}),await s,await fC(t,n),function(o){const a=Q(o);a.Ic.forEach((c,B)=>{Hs(a.remoteStore,B)}),a.Ac.e_(),a.Ic=new Map,a.Rc=new _e(q.comparator)}(t),t.mc=!1,await AB(t.remoteStore,!1)}}async function fC(r,e,t){const n=Q(r),s=[],i=[];for(const o of e){let a;const c=n.Tc.get(o);if(c&&c.length!==0){a=await Wa(n.localStore,Pe(c[0])?c[0]:yt(c[0]));for(const B of c){const h=n.hc.get(B),d=await $v(n,h);d.snapshot&&i.push(d.snapshot)}}else{const B=await Fm(n.localStore,o);a=await Wa(n.localStore,B),await Kl(n,Ym(B),o,!1,a.resumeToken)}s.push(a)}return n.Ec.hn(i),s}function Ym(r){return un(r)?r:ig(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function Xv(r){return function(t){return Q(Q(t).persistence).Ro()}(Q(r).localStore)}async function Zv(r,e,t,n){const s=Q(r);if(s.mc)return void G(ti,"Ignoring unexpected query state notification.");const i=s.Tc.get(e);if(i&&i.length>0)switch(t){case"current":case"not-current":{let o;if(Pe(i[0]))switch(hn(i[0])){case"collection_group":case"collection":o=await wB(s.localStore,Xg(i[0]));break;case"documents":o=await function(B,h){const d=Q(B),C=ie(...Ua(h).map(I=>q.fromPath(I)));return d.persistence.runTransaction("Get documents for pipeline","readonly",I=>d.Uo.getEntries(I,C)).then(I=>I)}(s.localStore,i[0]);break;default:Nt(""),o=Tr()}else o=await wB(s.localStore,function(B){return B.collectionGroup||(B.path.length%2==1?B.path.lastSegment():B.path.get(B.path.length-2))}(i[0]));const a=Ws.createSynthesizedRemoteEventForCurrentChange(e,t==="current",Ae.EMPTY_BYTE_STRING);await fr(s,o,a);break}case"rejected":await Us(s.localStore,e,!0),qs(s,e,n);break;default:$(64155,t)}}async function eR(r,e,t){const n=Gu(r);if(n.mc){for(const s of e){if(n.Tc.has(s)&&n.sharedClientState.isActiveQueryTarget(s)){G(ti,"Adding an already active target "+s);continue}const i=await Fm(n.localStore,s),o=await Wa(n.localStore,i);await Kl(n,Ym(i),o.targetId,!1,o.resumeToken),Mu(n.remoteStore,o)}for(const s of t)n.Tc.has(s)&&await Us(n.localStore,s,!1).then(()=>{Hs(n.remoteStore,s),qs(n,s)}).catch(hr)}}function Gu(r){const e=Q(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=Qm.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=zv.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=Hv.bind(null,e),e.Ec.hn=Sv.bind(null,e.eventManager),e.Ec.yc=Ov.bind(null,e.eventManager),e}function Wl(r){const e=Q(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=jv.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=qv.bind(null,e),e}class Co{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Du(e.databaseInfo.databaseId),this.sharedClientState=this.Sc(e),this.persistence=this.vc(e),await this.persistence.start(),this.localStore=this.Dc(e),this.gcScheduler=this.xc(e,this.localStore),this.indexBackfillerScheduler=this.Cc(e,this.localStore)}xc(e,t){return null}Cc(e,t){return null}Dc(e){return Sm(this.persistence,new Pm,e.initialUser,this.serializer)}vc(e){return new Sl(Vu.w_,this.serializer)}Sc(e){return new qm}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Co.provider={build:()=>new Co};class tR extends Co{constructor(e){super(),this.cacheSizeBytes=e}xc(e,t){H(this.persistence.referenceDelegate instanceof Qa,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new xg(n,e.asyncQueue,t)}vc(e){const t=this.cacheSizeBytes!==void 0?Xe.withCacheSize(this.cacheSizeBytes):Xe.DEFAULT;return new Sl(n=>Qa.w_(n,t),this.serializer)}}class Xm extends Co{constructor(e,t,n){super(),this.Fc=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Fc.initialize(this,e),await Wl(this.Fc.syncEngine),await Zs(this.Fc.remoteStore),await this.persistence.X_(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}Dc(e){return Sm(this.persistence,new Pm,e.initialUser,this.serializer)}xc(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new xg(n,e.asyncQueue,t)}Cc(e,t){const n=new Rv(t,this.persistence);return new vv(e.asyncQueue,n)}vc(e){const t=bm(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Xe.withCacheSize(this.cacheSizeBytes):Xe.DEFAULT;return new Ol(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,Jm(),Ta(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Sc(e){return new qm}}class nR extends Xm{constructor(e,t){super(e,t,!1),this.Fc=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Fc.syncEngine;this.sharedClientState instanceof Lc&&(this.sharedClientState.syncEngine={Iu:Wv.bind(null,t),Au:Zv.bind(null,t),Vu:eR.bind(null,t),Ro:Xv.bind(null,t),Ru:Qv.bind(null,t)},await this.sharedClientState.start()),await this.persistence.X_(async n=>{await Yv(this.Fc.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Sc(e){const t=Jm();if(!Lc.Je(t))throw new U(x.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=bm(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Lc(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class po{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>dC(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=Kv.bind(null,this.syncEngine),await AB(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new Pv}()}createDatastore(e){const t=Du(e.databaseInfo.databaseId),n=Cw(e.databaseInfo);return _w(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,s,i,o,a){return new pv(n,s,i,o,a)}(this.localStore,this.datastore,e.asyncQueue,t=>dC(this.syncEngine,t,0),function(){return Pf.Je()?new Pf:new lw}())}createSyncEngine(e,t){return function(s,i,o,a,c,B,h){const d=new xv(s,i,o,a,c,B);return h&&(d.mc=!0),d}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){await async function(t){const n=Q(t);G(sn,"RemoteStore shutting down."),n.ca.add(5),await Lo(n),n.Ea.shutdown(),n.ha.set("Unknown")}(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}po.provider={build:()=>new po};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ar="FirestoreClient";class rR{constructor(e,t,n,s,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this._databaseInfo=s,this.user=qe.UNAUTHENTICATED,this.clientId=qB.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(n,async o=>{G(ar,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(G(ar,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this._databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Xt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Gl(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function xc(r,e){r.asyncQueue.verifyOperationInProgress(),G(ar,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async s=>{n.isEqual(s)||(await Om(e.localStore,s),n=s)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function CC(r,e){r.asyncQueue.verifyOperationInProgress();const t=await sR(r);G(ar,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>uC(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,s)=>uC(e.remoteStore,s)),r._onlineComponents=e}async function sR(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){G(ar,"Using user provided OfflineComponentProvider");try{await xc(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(s){return s.name==="FirebaseError"?s.code===x.FAILED_PRECONDITION||s.code===x.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11}(t))throw t;Nt("Error using user provided cache. Falling back to memory cache: "+t),await xc(r,new Co)}}else G(ar,"Using default OfflineComponentProvider"),await xc(r,new tR(void 0));return r._offlineComponents}async function Zm(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(G(ar,"Using user provided OnlineComponentProvider"),await CC(r,r._uninitializedComponentsProvider._online)):(G(ar,"Using default OnlineComponentProvider"),await CC(r,new po))),r._onlineComponents}function iR(r){return Zm(r).then(e=>e.syncEngine)}async function eu(r){const e=await Zm(r),t=e.eventManager;return t.onListen=Vv.bind(null,e.syncEngine),t.onUnlisten=Mv.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=kv.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=Gv.bind(null,e.syncEngine),t}function oR(r,e,t,n){const s=new kl(n),i=new Jl(e,s,t);return r.asyncQueue.enqueueAndForget(async()=>Hl(await eu(r),i)),()=>{s.Aa(),r.asyncQueue.enqueueAndForget(async()=>jl(await eu(r),i))}}function aR(r,e,t={}){const n=new Xt;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,a,c,B){const h=new kl({next:C=>{h.Aa(),o.enqueueAndForget(()=>jl(i,d));const I=C.docs.has(a);!I&&C.fromCache?B.reject(new U(x.UNAVAILABLE,"Failed to get document because the client is offline.")):I&&C.fromCache&&c&&c.source==="server"?B.reject(new U(x.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):B.resolve(C)},error:C=>B.reject(C)}),d=new Jl(vo(a.path),h,{includeMetadataChanges:!0,waitForSyncWhenOnline:!0});return Hl(i,d)}(await eu(r),r.asyncQueue,e,t,n)),n.promise}function uR(r,e,t={}){const n=new Xt;return r.asyncQueue.enqueueAndForget(async()=>function(i,o,a,c,B){const h=new kl({next:C=>{h.Aa(),o.enqueueAndForget(()=>jl(i,d)),C.fromCache&&c.source==="server"?B.reject(new U(x.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):B.resolve(C)},error:C=>B.reject(C)}),d=new Jl(a instanceof Hi?aA(a):a,h,{includeMetadataChanges:!0,waitForSyncWhenOnline:!0});return Hl(i,d)}(await eu(r),r.asyncQueue,e,t,n)),n.promise}function cR(r,e){const t=new Xt;return r.asyncQueue.enqueueAndForget(async()=>Uv(await iR(r),e,t)),t.promise}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let eE=class{constructor(e,t,n,s,i){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=s,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new ve(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new BR(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}_fieldsProto(){return this._document?.data.clone().value.mapValue.fields??void 0}get(e){if(this._document){const t=this._document.data.field(nr("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}},BR=class extends eE{data(){return super.data()}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lR{convertValue(e,t="none"){switch(Fe(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Ie(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(gn(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw $(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return lr(e,(s,i)=>{n[s]=this.convertValue(i,t)}),n}convertVectorValue(e){const t=e.fields?.[jr].arrayValue?.values?.map(n=>Ie(n.doubleValue));return new ht(t)}convertGeoPoint(e){return new Yt(Ie(e.latitude),Ie(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=To(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(vs(e));default:return null}}convertTimestamp(e){const t=pn(e);return new ge(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=ue.fromString(e);H(wg(n),9688,{name:e});const s=new Hr(n.get(1),n.get(3)),i=new q(n.popFirst(5));return s.isEqual(t)||Se(`A document reference to ${i} refers to a different database (${s.projectId}/${s.database}), which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hR(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pC="AsyncQueue";class gC{constructor(e=Promise.resolve()){this.qc=[],this.$c=!1,this.Kc=[],this.Qc=null,this.Wc=!1,this.Gc=!1,this.zc=[],this.jt=new bg(this,"async_queue_retry"),this.jc=()=>{const n=Ta();n&&G(pC,"Visibility state changed to "+n.visibilityState),this.jt.qt()},this.Hc=e;const t=Ta();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.jc)}get isShuttingDown(){return this.$c}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Jc(),this.Yc(e)}enterRestrictedMode(e){if(!this.$c){this.$c=!0,this.Gc=e||!1;const t=Ta();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.jc)}}enqueue(e){if(this.Jc(),this.$c)return new Promise(()=>{});const t=new Xt;return this.Yc(()=>this.$c&&this.Gc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.qc.push(e),this.Zc()))}async Zc(){if(this.qc.length!==0){try{await this.qc[0](),this.qc.shift(),this.jt.reset()}catch(e){if(!dr(e))throw e;G(pC,"Operation failed with retryable error: "+e)}this.qc.length>0&&this.jt.Ut(()=>this.Zc())}}Yc(e){const t=this.Hc.then(()=>(this.Wc=!0,e().catch(n=>{throw this.Qc=n,this.Wc=!1,Se("INTERNAL UNHANDLED ERROR: ",mC(n)),n}).then(n=>(this.Wc=!1,n))));return this.Hc=t,t}enqueueAfterDelay(e,t,n){this.Jc(),this.zc.indexOf(e)>-1&&(t=0);const s=Ml.createAndSchedule(this,e,t,n,i=>this.Xc(i));return this.Kc.push(s),s}Jc(){this.Qc&&$(47125,{el:mC(this.Qc)})}verifyOperationInProgress(){}async tl(){let e;do e=this.Hc,await e;while(e!==this.Hc)}nl(e){for(const t of this.Kc)if(t.timerId===e)return!0;return!1}rl(e){return this.tl().then(()=>{this.Kc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.Kc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.tl()})}il(e){this.zc.push(e)}Xc(e){const t=this.Kc.indexOf(e);this.Kc.splice(t,1)}}function mC(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),e}class ur extends wu{constructor(e,t,n,s){super(e,t,n,s),this.type="firestore",this._queue=new gC,this._persistenceKey=s?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new gC(e),this._firestoreClient=void 0,await e}}}function l0(r,e,t){t||(t=Yi);const n=Br(r,"firestore");if(n.isInitialized(t)){const s=n.getImmediate({identifier:t}),i=n.getOptions(t);if(fn(i,e))return s;throw new U(x.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(e.cacheSizeBytes!==void 0&&e.localCache!==void 0)throw new U(x.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(e.cacheSizeBytes!==void 0&&e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Lg)throw new U(x.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return e.host&&Ks(e.host)&&kB(e.host),n.initialize({options:e,instanceIdentifier:t})}function h0(r,e){const t=typeof r=="object"?r:GB(),n=typeof r=="string"?r:e||Yi,s=Br(t,"firestore").getImmediate({identifier:n});if(!s._initialized){const i=oD("firestore");i&&vw(s,...i)}return s}function Uu(r){if(r._terminated)throw new U(x.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||dR(r),r._firestoreClient}function dR(r){const e=r._freezeSettings(),t=Iw(r._databaseId,r._app?.options.appId||"",r._persistenceKey,r._app?.options.apiKey,e);r._componentsProvider||e.localCache?._offlineComponentProvider&&e.localCache?._onlineComponentProvider&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new rR(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(s){const i=s?._online.build();return{_offline:s?._offline.build(i),_online:i}}(r._componentsProvider))}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yl extends lR{constructor(e){super(),this.firestore=e}convertBytes(e){return new St(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ve(this.firestore,null,t)}}class Fi{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Mr extends eE{constructor(e,t,n,s,i,o){super(e,t,n,s,o),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Aa(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(nr("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new U(x.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=Mr._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}Mr._jsonSchemaVersion="firestore/documentSnapshot/1.0",Mr._jsonSchema={type:Ne("string",Mr._jsonSchemaVersion),bundleSource:Ne("string","DocumentSnapshot"),bundleName:Ne("string"),bundle:Ne("string")};class Aa extends Mr{data(e={}){return super.data(e)}}class Gr{constructor(e,t,n,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new Fi(s.hasPendingWrites,s.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new Aa(this._firestore,this._userDataWriter,n.key,n,new Fi(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new U(x.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(s,i){if(s._snapshot.oldDocs.isEmpty()){let o=0;return s._snapshot.docChanges.map(a=>{Pe(s._snapshot.query)?IB(s._snapshot.query):el(s.query._query);const c=new Aa(s._firestore,s._userDataWriter,a.doc.key,a.doc,new Fi(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);return a.doc,{type:"added",doc:c,oldIndex:-1,newIndex:o++}})}{let o=s._snapshot.oldDocs;return s._snapshot.docChanges.filter(a=>i||a.type!==3).map(a=>{const c=new Aa(s._firestore,s._userDataWriter,a.doc.key,a.doc,new Fi(s._snapshot.mutatedKeys.has(a.doc.key),s._snapshot.fromCache),s.query.converter);let B=-1,h=-1;return a.type!==0&&(B=o.indexOf(a.doc.key),o=o.delete(a.doc.key)),a.type!==1&&(o=o.add(a.doc),h=o.indexOf(a.doc.key)),{type:fR(a.type),doc:c,oldIndex:B,newIndex:h}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new U(x.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Gr._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=qB.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],s=[];return this.docs.forEach(i=>{i._document!==null&&(t.push(i._document),n.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),s.push(i.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function fR(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return $(61501,{type:r})}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Gr._jsonSchemaVersion="firestore/querySnapshot/1.0",Gr._jsonSchema={type:Ne("string",Gr._jsonSchemaVersion),bundleSource:Ne("string","QuerySnapshot"),bundleName:Ne("string"),bundle:Ne("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tE(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new U(x.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Xl{}class CR extends Xl{}function d0(r,e,...t){let n=[];e instanceof Xl&&n.push(e),n=n.concat(t),function(i){const o=i.filter(c=>c instanceof Zl).length,a=i.filter(c=>c instanceof Hu).length;if(o>1||o>0&&a>0)throw new U(x.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const s of n)r=s._apply(r);return r}class Hu extends CR{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new Hu(e,t,n)}_apply(e){const t=this._parse(e);return nE(e._query,t),new Yr(e.firestore,e.converter,aB(e._query,t))}_parse(e){const t=ul(e.firestore);return function(i,o,a,c,B,h,d){let C;if(B.isKeyField()){if(h==="array-contains"||h==="array-contains-any")throw new U(x.INVALID_ARGUMENT,`Invalid Query. You can't perform '${h}' queries on documentId().`);if(h==="in"||h==="not-in"){_C(d,h);const R=[];for(const N of d)R.push(EC(c,i,N));C={arrayValue:{values:R}}}else C=EC(c,i,d)}else h!=="in"&&h!=="not-in"&&h!=="array-contains-any"||_C(d,h),C=Fw(a,o,d,h==="in"||h==="not-in");return le.create(B,h,C)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function f0(r,e,t){const n=e,s=nr("where",r);return Hu._create(s,n,t)}class Zl extends Xl{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new Zl(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:me.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(s,i){let o=s;const a=i.getFlattenedFilters();for(const c of a)nE(o,c),o=aB(o,c)}(e._query,t),new Yr(e.firestore,e.converter,aB(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}function EC(r,e,t){if(typeof(t=Te(t))=="string"){if(t==="")throw new U(x.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!og(e)&&t.indexOf("/")!==-1)throw new U(x.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(ue.fromString(t));if(!q.isDocumentKey(n))throw new U(x.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return Zi(r,new q(n))}if(t instanceof ve)return Zi(r,t._key);throw new U(x.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${du(t)}.`)}function _C(r,e){if(!Array.isArray(r)||r.length===0)throw new U(x.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function nE(r,e){const t=function(s,i){for(const o of s)for(const a of o.getFlattenedFilters())if(i.indexOf(a.op)>=0)return a.op;return null}(r.filters,function(s){switch(s){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new U(x.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new U(x.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function DC(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const s=t;for(const i of n)if(i in s&&typeof s[i]=="function")return!0;return!1}(r,["next","error","complete"])}class pR{constructor(e){let t;this.kind="persistent",e?.tabManager?(e.tabManager._initialize(e),t=e.tabManager):(t=ER(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function C0(r){return new pR(r)}class gR{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=po.provider,this._offlineComponentProvider={build:t=>new Xm(t,e?.cacheSizeBytes,this.forceOwnership)}}}class mR{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=po.provider,this._offlineComponentProvider={build:t=>new nR(t,e?.cacheSizeBytes)}}}function ER(r){return new gR(r?.forceOwnership)}function p0(){return new mR}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function g0(r){r=It(r,ve);const e=It(r.firestore,ur),t=Uu(e);return aR(t,r._key).then(n=>rE(e,r,n))}function m0(r){r=It(r,Yr);const e=It(r.firestore,ur),t=Uu(e),n=new Yl(e);return tE(r._query),uR(t,r._query).then(s=>new Gr(e,n,r,s))}function E0(r,e,t){r=It(r,ve);const n=It(r.firestore,ur),s=hR(r.converter,e,t),i=ul(n);return eh(n,[Sw(i,"setDoc",r._key,s,r.converter!==null,t).toMutation(r._key,ot.none())])}function _0(r,e,t,...n){r=It(r,ve);const s=It(r.firestore,ur),i=ul(s);let o;return o=typeof(e=Te(e))=="string"||e instanceof Iu?Nw(i,"updateDoc",r._key,e,t,n):Ow(i,"updateDoc",r._key,e),eh(s,[o.toMutation(r._key,ot.exists(!0))])}function D0(r){return eh(It(r.firestore,ur),[new Eu(r._key,ot.none())])}function I0(r,...e){r=Te(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||DC(e[n])||(t=e[n++]);const s={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(DC(e[n])){const B=e[n];e[n]=B.next?.bind(B),e[n+1]=B.error?.bind(B),e[n+2]=B.complete?.bind(B)}let i,o,a;if(r instanceof ve)o=It(r.firestore,ur),a=vo(r._key.path),i={next:B=>{e[n]&&e[n](rE(o,r,B))},error:e[n+1],complete:e[n+2]};else{const B=It(r,Yr);o=It(B.firestore,ur),a=B._query;const h=new Yl(o);i={next:d=>{e[n]&&e[n](new Gr(o,h,B,d))},error:e[n+1],complete:e[n+2]},tE(r._query)}const c=Uu(o);return oR(c,a,s,i)}function eh(r,e){const t=Uu(r);return cR(t,e)}function rE(r,e,t){const n=t.docs.get(e._key),s=new Yl(r);return new Mr(r,s,e._key,n,new Fi(t.hasPendingWrites,t.fromCache),e.converter)}const IC="@firebase/firestore",yC="4.17.1";(function(e,t=!0){iy(zs),nn(new Vt("firestore",(n,{instanceIdentifier:s,options:i})=>{const o=n.getProvider("app").getImmediate(),a=new ur(new aw(n.getProvider("auth-internal")),new Bw(o,n.getProvider("app-check-internal")),fy(o,s),o);return i={useFetchStreams:t,...i},a._setSettings(i),a},"PUBLIC").setMultipleInstances(!0)),Ot(IC,yC,e),Ot(IC,yC,"esm2020")})();function sE(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const _R=sE,iE=new Wr("auth","Firebase",sE());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tu=new hu("@firebase/auth");function oE(r,...e){tu.logLevel<=Be.WARN&&tu.warn(`Auth (${zs}): ${r}`,...e)}function va(r,...e){tu.logLevel<=Be.ERROR&&tu.error(`Auth (${zs}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kt(r,...e){throw th(r,...e)}function Zt(r,...e){return th(r,...e)}function aE(r,e,t){const n={..._R(),[e]:t};return new Wr("auth","Firebase",n).create(e,{appName:r.name})}function en(r){return aE(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function th(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return iE.create(r,...e)}function re(r,e,...t){if(!r)throw th(e,...t)}function Bn(r){const e="INTERNAL ASSERTION FAILED: "+r;throw va(e),new Error(e)}function _n(r,e){r||Bn(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function PB(){return typeof self<"u"&&self.location?.href||""}function DR(){return wC()==="http:"||wC()==="https:"}function wC(){return typeof self<"u"&&self.location?.protocol||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function IR(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(DR()||xB()||"connection"in navigator)?navigator.onLine:!0}function yR(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xo{constructor(e,t){this.shortDelay=e,this.longDelay=t,_n(t>e,"Short delay should be less than long delay!"),this.isMobile=uD()||BD()}get(){return IR()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nh(r,e){_n(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uE{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Bn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Bn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Bn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wR={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const TR=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],AR=new xo(3e4,6e4);function on(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function yn(r,e,t,n,s={}){return cE(r,s,async()=>{let i={},o={};n&&(e==="GET"?o=n:i={body:JSON.stringify(n)});const a=Do({...o,key:r.config.apiKey}).slice(1),c=await r._getAdditionalHeaders();c["Content-Type"]="application/json",r.languageCode&&(c["X-Firebase-Locale"]=r.languageCode);const B={method:e,headers:c,...i};return cD()||(B.referrerPolicy="strict-origin-when-cross-origin"),r.emulatorConfig&&Ks(r.emulatorConfig.host)&&(B.credentials="include"),uE.fetch()(await BE(r,r.config.apiHost,t,a),B)})}async function cE(r,e,t){r._canInitEmulator=!1;const n={...wR,...e};try{const s=new RR(r),i=await Promise.race([t(),s.promise]);s.clearNetworkTimeout();const o=await i.json();if("needConfirmation"in o)throw fa(r,"account-exists-with-different-credential",o);if(i.ok&&!("errorMessage"in o))return o;{const a=i.ok?o.errorMessage:o.error.message,[c,B]=a.split(" : ");if(c==="FEDERATED_USER_ID_ALREADY_LINKED")throw fa(r,"credential-already-in-use",o);if(c==="EMAIL_EXISTS")throw fa(r,"email-already-in-use",o);if(c==="USER_DISABLED")throw fa(r,"user-disabled",o);const h=n[c]||c.toLowerCase().replace(/[_\s]+/g,"-");if(B)throw aE(r,h,B);kt(r,h)}}catch(s){if(s instanceof Mt)throw s;kt(r,"network-request-failed",{message:String(s)})}}async function ni(r,e,t,n,s={}){const i=await yn(r,e,t,n,s);return"mfaPendingCredential"in i&&kt(r,"multi-factor-auth-required",{_serverResponse:i}),i}async function BE(r,e,t,n){const s=`${e}${t}?${n}`,i=r,o=i.config.emulator?nh(r.config,s):`${r.config.apiScheme}://${s}`;return TR.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(o).toString():o}function vR(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class RR{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(Zt(this.auth,"network-request-failed")),AR.get())})}}function fa(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const s=Zt(r,e,n);return s.customData._tokenResponse=t,s}function TC(r){return r!==void 0&&r.enterprise!==void 0}class bR{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return vR(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function PR(r,e){return yn(r,"GET","/v2/recaptchaConfig",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function SR(r,e){return yn(r,"POST","/v1/accounts:delete",e)}async function nu(r,e){return yn(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $i(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function OR(r,e=!1){const t=Te(r),n=await t.getIdToken(e),s=rh(n);re(s&&s.exp&&s.auth_time&&s.iat,t.auth,"internal-error");const i=typeof s.firebase=="object"?s.firebase:void 0,o=i?.sign_in_provider;return{claims:s,token:n,authTime:$i(Vc(s.auth_time)),issuedAtTime:$i(Vc(s.iat)),expirationTime:$i(Vc(s.exp)),signInProvider:o||null,signInSecondFactor:i?.sign_in_second_factor||null}}function Vc(r){return Number(r)*1e3}function rh(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return va("JWT malformed, contained fewer than 3 sections"),null;try{const s=tp(t);return s?JSON.parse(s):(va("Failed to decode base64 JWT payload"),null)}catch(s){return va("Caught error parsing JWT payload as JSON",s?.toString()),null}}function AC(r){const e=rh(r);return re(e,"internal-error"),re(typeof e.exp<"u","internal-error"),re(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function go(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof Mt&&NR(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function NR({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class FR{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class SB{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=$i(this.lastLoginAt),this.creationTime=$i(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ru(r){const e=r.auth,t=await r.getIdToken(),n=await go(r,nu(e,{idToken:t}));re(n?.users.length,e,"internal-error");const s=n.users[0];r._notifyReloadListener(s);const i=s.providerUserInfo?.length?lE(s.providerUserInfo):[],o=xR(r.providerData,i),a=r.isAnonymous,c=!(r.email&&s.passwordHash)&&!o?.length,B=a?c:!1,h={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:o,metadata:new SB(s.createdAt,s.lastLoginAt),isAnonymous:B};Object.assign(r,h)}async function LR(r){const e=Te(r);await ru(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function xR(r,e){return[...r.filter(n=>!e.some(s=>s.providerId===n.providerId)),...e]}function lE(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function VR(r,e){const t=await cE(r,{},async()=>{const n=Do({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:s,apiKey:i}=r.config,o=await BE(r,s,"/v1/token",`key=${i}`),a=await r._getAdditionalHeaders();a["Content-Type"]="application/x-www-form-urlencoded";const c={method:"POST",headers:a,body:n};return r.emulatorConfig&&Ks(r.emulatorConfig.host)&&(c.credentials="include"),uE.fetch()(o,c)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function kR(r,e){return yn(r,"POST","/v2/accounts:revokeToken",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Is{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){re(e.idToken,"internal-error"),re(typeof e.idToken<"u","internal-error"),re(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):AC(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){re(e.length!==0,"internal-error");const t=AC(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(re(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:s,expiresIn:i}=await VR(e,t);this.updateTokensAndExpiration(n,s,Number(i))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:s,expirationTime:i}=t,o=new Is;return n&&(re(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),s&&(re(typeof s=="string","internal-error",{appName:e}),o.accessToken=s),i&&(re(typeof i=="number","internal-error",{appName:e}),o.expirationTime=i),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Is,this.toJSON())}_performRefresh(){return Bn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xn(r,e){re(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class xt{constructor({uid:e,auth:t,stsTokenManager:n,...s}){this.providerId="firebase",this.proactiveRefresh=new FR(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new SB(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){const t=await go(this,this.stsTokenManager.getToken(this.auth,e));return re(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return OR(this,e)}reload(){return LR(this)}_assign(e){this!==e&&(re(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new xt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){re(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await ru(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(_t(this.auth.app))return Promise.reject(en(this.auth));const e=await this.getIdToken();return await go(this,SR(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,s=t.email??void 0,i=t.phoneNumber??void 0,o=t.photoURL??void 0,a=t.tenantId??void 0,c=t._redirectEventId??void 0,B=t.createdAt??void 0,h=t.lastLoginAt??void 0,{uid:d,emailVerified:C,isAnonymous:I,providerData:R,stsTokenManager:N}=t;re(d&&N,e,"internal-error");const M=Is.fromJSON(this.name,N);re(typeof d=="string",e,"internal-error"),xn(n,e.name),xn(s,e.name),re(typeof C=="boolean",e,"internal-error"),re(typeof I=="boolean",e,"internal-error"),xn(i,e.name),xn(o,e.name),xn(a,e.name),xn(c,e.name),xn(B,e.name),xn(h,e.name);const K=new xt({uid:d,auth:e,email:s,emailVerified:C,displayName:n,isAnonymous:I,photoURL:o,phoneNumber:i,tenantId:a,stsTokenManager:M,createdAt:B,lastLoginAt:h});return R&&Array.isArray(R)&&(K.providerData=R.map(Z=>({...Z}))),c&&(K._redirectEventId=c),K}static async _fromIdTokenResponse(e,t,n=!1){const s=new Is;s.updateFromServerResponse(t);const i=new xt({uid:t.localId,auth:e,stsTokenManager:s,isAnonymous:n});return await ru(i),i}static async _fromGetAccountInfoResponse(e,t,n){const s=t.users[0];re(s.localId!==void 0,"internal-error");const i=s.providerUserInfo!==void 0?lE(s.providerUserInfo):[],o=!(s.email&&s.passwordHash)&&!i?.length,a=new Is;a.updateFromIdToken(n);const c=new xt({uid:s.localId,auth:e,stsTokenManager:a,isAnonymous:o}),B={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:i,metadata:new SB(s.createdAt,s.lastLoginAt),isAnonymous:!(s.email&&s.passwordHash)&&!i?.length};return Object.assign(c,B),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vC=new Map;function ln(r){_n(r instanceof Function,"Expected a class definition");let e=vC.get(r);return e?(_n(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,vC.set(r,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hE{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}hE.type="NONE";const RC=hE;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ra(r,e,t){return`firebase:${r}:${e}:${t}`}class ys{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:s,name:i}=this.auth;this.fullUserKey=Ra(this.userKey,s.apiKey,i),this.fullPersistenceKey=Ra("persistence",s.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await nu(this.auth,{idToken:e}).catch(()=>{});return t?xt._fromGetAccountInfoResponse(this.auth,t,e):null}return xt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new ys(ln(RC),e,n);const s=(await Promise.all(t.map(async B=>{if(await B._isAvailable())return B}))).filter(B=>B);let i=s[0]||ln(RC);const o=Ra(n,e.config.apiKey,e.name);let a=null;for(const B of t)try{const h=await B._get(o);if(h){let d;if(typeof h=="string"){const C=await nu(e,{idToken:h}).catch(()=>{});if(!C)break;d=await xt._fromGetAccountInfoResponse(e,C,h)}else d=xt._fromJSON(e,h);B!==i&&(a=d),i=B;break}}catch{}const c=s.filter(B=>B._shouldAllowMigration);return!i._shouldAllowMigration||!c.length?new ys(i,e,n):(i=c[0],a&&await i._set(o,a.toJSON()),await Promise.all(t.map(async B=>{if(B!==i)try{await B._remove(o)}catch{}})),new ys(i,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bC(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(pE(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(dE(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(mE(e))return"Blackberry";if(EE(e))return"Webos";if(fE(e))return"Safari";if((e.includes("chrome/")||CE(e))&&!e.includes("edge/"))return"Chrome";if(gE(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if(n?.length===2)return n[1]}return"Other"}function dE(r=Me()){return/firefox\//i.test(r)}function fE(r=Me()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function CE(r=Me()){return/crios\//i.test(r)}function pE(r=Me()){return/iemobile/i.test(r)}function gE(r=Me()){return/android/i.test(r)}function mE(r=Me()){return/blackberry/i.test(r)}function EE(r=Me()){return/webos/i.test(r)}function sh(r=Me()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function MR(r=Me()){return sh(r)&&!!window.navigator?.standalone}function GR(){return lD()&&document.documentMode===10}function _E(r=Me()){return sh(r)||gE(r)||EE(r)||mE(r)||/windows phone/i.test(r)||pE(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function DE(r,e=[]){let t;switch(r){case"Browser":t=bC(Me());break;case"Worker":t=`${bC(Me())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${zs}/${n}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class UR{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=i=>new Promise((o,a)=>{try{const c=e(i);o(c)}catch(c){a(c)}});n.onAbort=t,this.queue.push(n);const s=this.queue.length-1;return()=>{this.queue[s]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const s of t)try{s()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n?.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function HR(r,e={}){return yn(r,"GET","/v2/passwordPolicy",on(r,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jR=6;class qR{constructor(e){const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??jR,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,s=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),s&&(t.meetsMaxPasswordLength=e.length<=s)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let s=0;s<e.length;s++)n=e.charAt(s),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,s,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=s)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JR{constructor(e,t,n,s){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=s,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new PC(this),this.idTokenSubscription=new PC(this),this.beforeStateQueue=new UR(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=iE,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=s.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=ln(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted&&(this.persistenceManager=await ys.create(this,e),this._resolvePersistenceManagerAvailable?.(),!this._deleted)){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=this.currentUser?.uid||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await nu(this,{idToken:e}),n=await xt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if(_t(this.app)){const i=this.app.settings.authIdToken;return i?new Promise(o=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(i).then(o,o))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const i=this.redirectUser?._redirectEventId,o=n?._redirectEventId,a=await this.tryRedirectSignIn(e);(!i||i===o)&&a?.user&&(n=a.user,s=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(n)}catch(i){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(i))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return re(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await ru(e)}catch(t){if(t?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=yR()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(_t(this.app))return Promise.reject(en(this));const t=e?Te(e):null;return t&&re(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&re(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return _t(this.app)?Promise.reject(en(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return _t(this.app)?Promise.reject(en(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(ln(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await HR(this),t=new qR(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Wr("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await kR(this,n)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&ln(e)||this._popupRedirectResolver;re(t,this,"argument-error"),this.redirectPersistenceManager=await ys.create(this,[ln(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,s){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let o=!1;const a=this._isInitialized?Promise.resolve():this._initializationPromise;if(re(a,this,"internal-error"),a.then(()=>{o||i(this.currentUser)}),typeof t=="function"){const c=e.addObserver(t,n,s);return()=>{o=!0,c()}}else{const c=e.addObserver(t);return()=>{o=!0,c()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return re(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=DE(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){if(_t(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&oE(`Error while retrieving App Check token: ${e.error}`),e?.token}}function wn(r){return Te(r)}class PC{constructor(e){this.auth=e,this.observer=null,this.addObserver=CD(t=>this.observer=t)}get next(){return re(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ju={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function KR(r){ju=r}function IE(r){return ju.loadJS(r)}function zR(){return ju.recaptchaEnterpriseScript}function $R(){return ju.gapiScript}function QR(r){return`__${r}${Math.floor(Math.random()*1e6)}`}class WR{constructor(){this.enterprise=new YR}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class YR{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const XR="recaptcha-enterprise",yE="NO_RECAPTCHA",SC="onFirebaseAuthREInstanceReady";class Gn{constructor(e){this.type=XR,this.auth=wn(e)}async verify(e="verify",t=!1){async function n(i){if(!t){if(i.tenantId==null&&i._agentRecaptchaConfig!=null)return i._agentRecaptchaConfig.siteKey;if(i.tenantId!=null&&i._tenantRecaptchaConfigs[i.tenantId]!==void 0)return i._tenantRecaptchaConfigs[i.tenantId].siteKey}return new Promise(async(o,a)=>{PR(i,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(c=>{if(c.recaptchaKey===void 0)a(new Error("recaptcha Enterprise site key undefined"));else{const B=new bR(c);return i.tenantId==null?i._agentRecaptchaConfig=B:i._tenantRecaptchaConfigs[i.tenantId]=B,o(B.siteKey)}}).catch(c=>{a(c)})})}function s(i,o,a){const c=window.grecaptcha;TC(c)?c.enterprise.ready(()=>{c.enterprise.execute(i,{action:e}).then(B=>{o(B)}).catch(()=>{o(yE)})}):a(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new WR().execute("siteKey",{action:"verify"}):new Promise((i,o)=>{n(this.auth).then(async a=>{if(!t&&TC(window.grecaptcha)&&Gn.scriptInjectionDeferred)await Gn.scriptInjectionDeferred.promise,s(a,i,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let c=zR();c.length!==0&&(c+=a+`&onload=${SC}`),Gn.scriptInjectionDeferred=new op,window[SC]=()=>{Gn.scriptInjectionDeferred?.resolve()},IE(c).then(()=>Gn.scriptInjectionDeferred?.promise).then(()=>{s(a,i,o)}).catch(B=>{o(B)})}}).catch(a=>{o(a)})})}}Gn.scriptInjectionDeferred=null;async function OC(r,e,t,n=!1,s=!1){const i=new Gn(r);let o;if(s)o=yE;else try{o=await i.verify(t)}catch{o=await i.verify(t,!0)}const a={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in a){const c=a.phoneEnrollmentInfo.phoneNumber,B=a.phoneEnrollmentInfo.recaptchaToken;Object.assign(a,{phoneEnrollmentInfo:{phoneNumber:c,recaptchaToken:B,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in a){const c=a.phoneSignInInfo.recaptchaToken;Object.assign(a,{phoneSignInInfo:{recaptchaToken:c,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return a}return n?Object.assign(a,{captchaResp:o}):Object.assign(a,{captchaResponse:o}),Object.assign(a,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(a,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),a}async function su(r,e,t,n,s){if(r._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const i=await OC(r,e,t,t==="getOobCode");return n(r,i)}else return n(r,e).catch(async i=>{if(i.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const o=await OC(r,e,t,t==="getOobCode");return n(r,o)}else return Promise.reject(i)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZR(r,e){const t=Br(r,"auth");if(t.isInitialized()){const s=t.getImmediate(),i=t.getOptions();if(fn(i,e??{}))return s;kt(s,"already-initialized")}return t.initialize({options:e})}function eb(r,e){const t=e?.persistence||[],n=(Array.isArray(t)?t:[t]).map(ln);e?.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e?.popupRedirectResolver)}function tb(r,e,t){const n=wn(r);re(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const s=!1,i=wE(e),{host:o,port:a}=nb(e),c=a===null?"":`:${a}`,B={url:`${i}//${o}${c}/`},h=Object.freeze({host:o,port:a,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:s})});if(!n._canInitEmulator){re(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),re(fn(B,n.config.emulator)&&fn(h,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=B,n.emulatorConfig=h,n.settings.appVerificationDisabledForTesting=!0,Ks(o)?kB(`${i}//${o}${c}`):rb()}function wE(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function nb(r){const e=wE(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",s=/^(\[[^\]]+\])(:|$)/.exec(n);if(s){const i=s[1];return{host:i,port:NC(n.substr(i.length+1))}}else{const[i,o]=n.split(":");return{host:i,port:NC(o)}}}function NC(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function rb(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ih{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Bn("not implemented")}_getIdTokenResponse(e){return Bn("not implemented")}_linkToIdToken(e,t){return Bn("not implemented")}_getReauthenticationResolver(e){return Bn("not implemented")}}async function sb(r,e){return yn(r,"POST","/v1/accounts:signUp",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ib(r,e){return ni(r,"POST","/v1/accounts:signInWithPassword",on(r,e))}async function ob(r,e){return yn(r,"POST","/v1/accounts:sendOobCode",on(r,e))}async function ab(r,e){return ob(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ub(r,e){return ni(r,"POST","/v1/accounts:signInWithEmailLink",on(r,e))}async function cb(r,e){return ni(r,"POST","/v1/accounts:signInWithEmailLink",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo extends ih{constructor(e,t,n,s=null){super("password",n),this._email=e,this._password=t,this._tenantId=s}static _fromEmailAndPassword(e,t){return new mo(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new mo(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t?.email&&t?.password){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return su(e,t,"signInWithPassword",ib);case"emailLink":return ub(e,{email:this._email,oobCode:this._password});default:kt(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return su(e,n,"signUpPassword",sb);case"emailLink":return cb(e,{idToken:t,email:this._email,oobCode:this._password});default:kt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ws(r,e){return ni(r,"POST","/v1/accounts:signInWithIdp",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bb="http://localhost";class zr extends ih{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new zr(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):kt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:s,...i}=t;if(!n||!s)return null;const o=new zr(n,s);return o.idToken=i.idToken||void 0,o.accessToken=i.accessToken||void 0,o.secret=i.secret,o.nonce=i.nonce,o.pendingToken=i.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return ws(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,ws(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,ws(e,t)}buildRequest(){const e={requestUri:Bb,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Do(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lb(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function hb(r){const e=vi(Ri(r)).link,t=e?vi(Ri(e)).deep_link_id:null,n=vi(Ri(r)).deep_link_id;return(n?vi(Ri(n)).link:null)||n||t||e||r}class oh{constructor(e){const t=vi(Ri(e)),n=t.apiKey??null,s=t.oobCode??null,i=lb(t.mode??null);re(n&&s&&i,"argument-error"),this.apiKey=n,this.operation=i,this.code=s,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=hb(e);try{return new oh(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ri{constructor(){this.providerId=ri.PROVIDER_ID}static credential(e,t){return mo._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=oh.parseLink(t);return re(n,"argument-error"),mo._fromEmailAndCode(e,n.code,n.tenantId)}}ri.PROVIDER_ID="password";ri.EMAIL_PASSWORD_SIGN_IN_METHOD="password";ri.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class TE{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vo extends TE{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Un extends Vo{constructor(){super("facebook.com")}static credential(e){return zr._fromParams({providerId:Un.PROVIDER_ID,signInMethod:Un.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Un.credentialFromTaggedObject(e)}static credentialFromError(e){return Un.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Un.credential(e.oauthAccessToken)}catch{return null}}}Un.FACEBOOK_SIGN_IN_METHOD="facebook.com";Un.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hn extends Vo{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return zr._fromParams({providerId:Hn.PROVIDER_ID,signInMethod:Hn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Hn.credentialFromTaggedObject(e)}static credentialFromError(e){return Hn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Hn.credential(t,n)}catch{return null}}}Hn.GOOGLE_SIGN_IN_METHOD="google.com";Hn.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jn extends Vo{constructor(){super("github.com")}static credential(e){return zr._fromParams({providerId:jn.PROVIDER_ID,signInMethod:jn.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return jn.credentialFromTaggedObject(e)}static credentialFromError(e){return jn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return jn.credential(e.oauthAccessToken)}catch{return null}}}jn.GITHUB_SIGN_IN_METHOD="github.com";jn.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qn extends Vo{constructor(){super("twitter.com")}static credential(e,t){return zr._fromParams({providerId:qn.PROVIDER_ID,signInMethod:qn.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return qn.credentialFromTaggedObject(e)}static credentialFromError(e){return qn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return qn.credential(t,n)}catch{return null}}}qn.TWITTER_SIGN_IN_METHOD="twitter.com";qn.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function db(r,e){return ni(r,"POST","/v1/accounts:signUp",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cr{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,s=!1){const i=await xt._fromIdTokenResponse(e,n,s),o=FC(n);return new cr({user:i,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const s=FC(n);return new cr({user:e,providerId:s,_tokenResponse:n,operationType:t})}}function FC(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iu extends Mt{constructor(e,t,n,s){super(t.code,t.message),this.operationType=n,this.user=s,Object.setPrototypeOf(this,iu.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,s){return new iu(e,t,n,s)}}function AE(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?iu._fromErrorAndOperation(r,i,e,n):i})}async function fb(r,e,t=!1){const n=await go(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return cr._forOperation(r,"link",n)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Cb(r,e,t=!1){const{auth:n}=r;if(_t(n.app))return Promise.reject(en(n));const s="reauthenticate";try{const i=await go(r,AE(n,s,e,r),t);re(i.idToken,n,"internal-error");const o=rh(i.idToken);re(o,n,"internal-error");const{sub:a}=o;return re(r.uid===a,n,"user-mismatch"),cr._forOperation(r,s,i)}catch(i){throw i?.code==="auth/user-not-found"&&kt(n,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function vE(r,e,t=!1){if(_t(r.app))return Promise.reject(en(r));const n="signIn",s=await AE(r,n,e),i=await cr._fromIdTokenResponse(r,n,s);return t||await r._updateCurrentUser(i.user),i}async function pb(r,e){return vE(wn(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gb(r,e){return ni(r,"POST","/v1/accounts:signInWithCustomToken",on(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function y0(r,e){if(_t(r.app))return Promise.reject(en(r));const t=wn(r),n=await gb(t,{token:e,returnSecureToken:!0}),s=await cr._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(s.user),s}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function RE(r){const e=wn(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function w0(r,e,t){const n=wn(r);await su(n,{requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"},"getOobCode",ab)}async function T0(r,e,t){if(_t(r.app))return Promise.reject(en(r));const n=wn(r),o=await su(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",db).catch(c=>{throw c.code==="auth/password-does-not-meet-requirements"&&RE(r),c}),a=await cr._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(a.user),a}function A0(r,e,t){return _t(r.app)?Promise.reject(en(r)):pb(Te(r),ri.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&RE(r),n})}function mb(r,e,t,n){return Te(r).onIdTokenChanged(e,t,n)}function Eb(r,e,t){return Te(r).beforeAuthStateChanged(e,t)}function v0(r,e,t,n){return Te(r).onAuthStateChanged(e,t,n)}function R0(r){return Te(r).signOut()}const ou="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bE{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(ou,"1"),this.storage.removeItem(ou),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _b=1e3,Db=10;class PE extends bE{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=_E(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),s=this.localCache[t];n!==s&&e(t,s,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,a,c)=>{this.notifyListeners(o,c)});return}const n=e.key;t?this.detachListener():this.stopPolling();const s=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},i=this.storage.getItem(n);GR()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(s,Db):s()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},_b)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}PE.type="LOCAL";const Ib=PE;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class SE extends bE{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}SE.type="SESSION";const OE=SE;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yb(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qu{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(s=>s.isListeningto(e));if(t)return t;const n=new qu(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:s,data:i}=t.data,o=this.handlersMap[s];if(!o?.size)return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:s});const a=Array.from(o).map(async B=>B(t.origin,i)),c=await yb(a);t.ports[0].postMessage({status:"done",eventId:n,eventType:s,response:c})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}qu.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ah(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wb{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const s=typeof MessageChannel<"u"?new MessageChannel:null;if(!s)throw new Error("connection_unavailable");let i,o;return new Promise((a,c)=>{const B=ah("",20);s.port1.start();const h=setTimeout(()=>{c(new Error("unsupported_event"))},n);o={messageChannel:s,onMessage(d){const C=d;if(C.data.eventId===B)switch(C.data.status){case"ack":clearTimeout(h),i=setTimeout(()=>{c(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),a(C.data.response);break;default:clearTimeout(h),clearTimeout(i),c(new Error("invalid_response"));break}}},this.handlers.add(o),s.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:B,data:t},[s.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tn(){return window}function Tb(r){tn().location.href=r}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function NE(){return typeof tn().WorkerGlobalScope<"u"&&typeof tn().importScripts=="function"}async function Ab(){if(!navigator?.serviceWorker)return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function vb(){return navigator?.serviceWorker?.controller||null}function Rb(){return NE()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const FE="firebaseLocalStorageDb",bb=1,au="firebaseLocalStorage",LE="fbase_key";class ko{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Ju(r,e){return r.transaction([au],e?"readwrite":"readonly").objectStore(au)}function Pb(){const r=indexedDB.deleteDatabase(FE);return new ko(r).toPromise()}function xE(){const r=indexedDB.open(FE,bb);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(au,{keyPath:LE})}catch(s){t(s)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(au)?e(n):(n.close(),await Pb(),e(await xE()))})})}async function LC(r,e,t){const n=Ju(r,!0).put({[LE]:e,value:t});return new ko(n).toPromise()}async function Sb(r,e){const t=Ju(r,!1).get(e),n=await new ko(t).toPromise();return n===void 0?null:n.value}function xC(r,e){const t=Ju(r,!0).delete(e);return new ko(t).toPromise()}const Ob=800,Nb=3;class VE{registerLifecycleListeners(){typeof window<"u"&&typeof window.addEventListener=="function"&&(window.addEventListener("pagehide",this.onPageHide),window.addEventListener("pageshow",this.onPageShow))}unregisterLifecycleListeners(){typeof window<"u"&&typeof window.removeEventListener=="function"&&(window.removeEventListener("pagehide",this.onPageHide),window.removeEventListener("pageshow",this.onPageShow))}constructor(){this.type="LOCAL",this.dbPromise=null,this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.isClosing=!1,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this.onPageHide=()=>{this.isClosing=!0,this.stopPolling(),this.dbPromise&&(this.dbPromise.then(e=>e.close()).catch(()=>{}),this.dbPromise=null)},this.onPageShow=()=>{this.isClosing&&(this.isClosing=!1,Object.keys(this.listeners).length>0&&this.startPolling())},this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){if(this.isClosing)throw new Error("Database is closing");return this.dbPromise?this.dbPromise:(this.dbPromise=xE(),this.dbPromise.catch(()=>{this.dbPromise=null}),this.dbPromise)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(this.isClosing||t++>Nb)throw n;this.dbPromise&&((await this.dbPromise).close(),this.dbPromise=null)}}async initializeServiceWorkerMessaging(){return NE()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=qu._getInstance(Rb()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){if(this.activeServiceWorker=await Ab(),!this.activeServiceWorker)return;this.sender=new wb(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&e[0]?.fulfilled&&e[0]?.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||vb()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{return indexedDB?(await this._withRetries(async e=>{await LC(e,ou,"1"),await xC(e,ou)}),!0):!1}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>LC(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>Sb(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>xC(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){if(this.isClosing)return[];try{const e=await this._withRetries(s=>{const i=Ju(s,!1).getAll();return new ko(i).toPromise()});if(this.isClosing)return[];if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:s,value:i}of e)n.add(s),JSON.stringify(this.localCache[s])!==JSON.stringify(i)&&(this.notifyListeners(s,i),t.push(s));for(const s of Object.keys(this.localCache))this.localCache[s]&&!n.has(s)&&(this.notifyListeners(s,null),t.push(s));return t}catch(e){return this.isClosing||oE(`Firebase Auth cross-tab polling failed with error: ${e}`),[]}}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const s of Array.from(n))s(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Ob)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.startPolling(),this.registerLifecycleListeners()),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.stopPolling(),this.unregisterLifecycleListeners())}}VE.type="LOCAL";const Fb=VE;new xo(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lb(r,e){return e?ln(e):(re(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uh extends ih{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ws(e,this._buildIdpRequest())}_linkToIdToken(e,t){return ws(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return ws(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function xb(r){return vE(r.auth,new uh(r),r.bypassAuthState)}function Vb(r){const{auth:e,user:t}=r;return re(t,e,"internal-error"),Cb(t,new uh(r),r.bypassAuthState)}async function kb(r){const{auth:e,user:t}=r;return re(t,e,"internal-error"),fb(t,new uh(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kE{constructor(e,t,n,s,i=!1){this.auth=e,this.resolver=n,this.user=s,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:s,tenantId:i,error:o,type:a}=e;if(o){this.reject(o);return}const c={auth:this.auth,requestUri:t,sessionId:n,tenantId:i||void 0,postBody:s||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(a)(c))}catch(B){this.reject(B)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return xb;case"linkViaPopup":case"linkViaRedirect":return kb;case"reauthViaPopup":case"reauthViaRedirect":return Vb;default:kt(this.auth,"internal-error")}}resolve(e){_n(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){_n(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mb=new xo(2e3,1e4);class _s extends kE{constructor(e,t,n,s,i){super(e,t,s,i),this.provider=n,this.authWindow=null,this.pollId=null,_s.currentPopupAction&&_s.currentPopupAction.cancel(),_s.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return re(e,this.auth,"internal-error"),e}async onExecution(){_n(this.filter.length===1,"Popup operations only handle one event");const e=ah();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(Zt(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){return this.authWindow?.associatedEvent||null}cancel(){this.reject(Zt(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,_s.currentPopupAction=null}pollUserCancellation(){const e=()=>{if(this.authWindow?.window?.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(Zt(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Mb.get())};e()}}_s.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gb="pendingRedirect",ba=new Map;class Ub extends kE{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=ba.get(this.auth._key());if(!e){try{const n=await Hb(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}ba.set(this.auth._key(),e)}return this.bypassAuthState||ba.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Hb(r,e){const t=Jb(e),n=qb(r);if(!await n._isAvailable())return!1;const s=await n._get(t)==="true";return await n._remove(t),s}function jb(r,e){ba.set(r._key(),e)}function qb(r){return ln(r._redirectPersistence)}function Jb(r){return Ra(Gb,r.config.apiKey,r.name)}async function Kb(r,e,t=!1){if(_t(r.app))return Promise.reject(en(r));const n=wn(r),s=Lb(n,e),o=await new Ub(n,s,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zb=10*60*1e3;class $b{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Qb(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){if(e.error&&!ME(e)){const n=e.error.code?.split("auth/")[1]||"internal-error";t.onError(Zt(this.auth,n))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=zb&&this.cachedEventUids.clear(),this.cachedEventUids.has(VC(e))}saveEventToCache(e){this.cachedEventUids.add(VC(e)),this.lastProcessedEventTime=Date.now()}}function VC(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function ME({type:r,error:e}){return r==="unknown"&&e?.code==="auth/no-auth-event"}function Qb(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return ME(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wb(r,e={}){return yn(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yb=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Xb=/^https?/;async function Zb(r){if(r.config.emulator)return;const{authorizedDomains:e}=await Wb(r);for(const t of e)try{if(eP(t))return}catch{}kt(r,"unauthorized-domain")}function eP(r){const e=PB(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!Xb.test(t))return!1;if(Yb.test(r))return n===r;const s=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+s+"|"+s+")$","i").test(n)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tP=new xo(3e4,6e4);function kC(){const r=tn().___jsl;if(r?.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function nP(r){return new Promise((e,t)=>{function n(){kC(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{kC(),t(Zt(r,"network-request-failed"))},timeout:tP.get()})}if(tn().gapi?.iframes?.Iframe)e(gapi.iframes.getContext());else if(tn().gapi?.load)n();else{const s=QR("iframefcb");return tn()[s]=()=>{gapi.load?n():t(Zt(r,"network-request-failed"))},IE(`${$R()}?onload=${s}`).catch(i=>t(i))}}).catch(e=>{throw Pa=null,e})}let Pa=null;function rP(r){return Pa=Pa||nP(r),Pa}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sP=new xo(5e3,15e3),iP="__/auth/iframe",oP="emulator/auth/iframe",aP={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},uP=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function cP(r){const e=r.config;re(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?nh(e,oP):`https://${r.config.authDomain}/${iP}`,n={apiKey:e.apiKey,appName:r.name,v:zs},s=uP.get(r.config.apiHost);s&&(n.eid=s);const i=r._getFrameworks();return i.length&&(n.fw=i.join(",")),`${t}?${Do(n).slice(1)}`}async function BP(r){const e=await rP(r),t=tn().gapi;return re(t,r,"internal-error"),e.open({where:document.body,url:cP(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:aP,dontclear:!0},n=>new Promise(async(s,i)=>{await n.restyle({setHideOnLeave:!1});const o=Zt(r,"network-request-failed"),a=tn().setTimeout(()=>{i(o)},sP.get());function c(){tn().clearTimeout(a),s(n)}n.ping(c).then(c,()=>{i(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lP={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},hP=500,dP=600,fP="_blank",CP="http://localhost";class MC{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function pP(r,e,t,n=hP,s=dP){const i=Math.max((window.screen.availHeight-s)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let a="";const c={...lP,width:n.toString(),height:s.toString(),top:i,left:o},B=Me().toLowerCase();t&&(a=CE(B)?fP:t),dE(B)&&(e=e||CP,c.scrollbars="yes");const h=Object.entries(c).reduce((C,[I,R])=>`${C}${I}=${R},`,"");if(MR(B)&&a!=="_self")return gP(e||"",a),new MC(null);const d=window.open(e||"",a,h);re(d,r,"popup-blocked");try{d.focus()}catch{}return new MC(d)}function gP(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mP="__/auth/handler",EP="emulator/auth/handler",_P=encodeURIComponent("fac");async function GC(r,e,t,n,s,i){re(r.config.authDomain,r,"auth-domain-config-required"),re(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:zs,eventId:s};if(e instanceof TE){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",fD(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[h,d]of Object.entries({}))o[h]=d}if(e instanceof Vo){const h=e.getScopes().filter(d=>d!=="");h.length>0&&(o.scopes=h.join(","))}r.tenantId&&(o.tid=r.tenantId);const a=o;for(const h of Object.keys(a))a[h]===void 0&&delete a[h];const c=await r._getAppCheckToken(),B=c?`#${_P}=${encodeURIComponent(c)}`:"";return`${DP(r)}?${Do(a).slice(1)}${B}`}function DP({config:r}){return r.emulator?nh(r,EP):`https://${r.authDomain}/${mP}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kc="webStorageSupport";class IP{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=OE,this._completeRedirectFn=Kb,this._overrideRedirectResult=jb}async _openPopup(e,t,n,s){_n(this.eventManagers[e._key()]?.manager,"_initialize() not called before _openPopup()");const i=await GC(e,t,n,PB(),s);return pP(e,i,ah())}async _openRedirect(e,t,n,s){await this._originValidation(e);const i=await GC(e,t,n,PB(),s);return Tb(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:s,promise:i}=this.eventManagers[t];return s?Promise.resolve(s):(_n(i,"If manager is not set, promise should be"),i)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await BP(e),n=new $b(e);return t.register("authEvent",s=>(re(s?.authEvent,e,"invalid-auth-event"),{status:n.onEvent(s.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(kc,{type:kc},s=>{const i=s?.[0]?.[kc];i!==void 0&&t(!!i),kt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Zb(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return _E()||fE()||sh()}}const yP=IP;var UC="@firebase/auth",HC="1.13.5";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wP{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e(n?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){re(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function TP(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function AP(r){nn(new Vt("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:o,authDomain:a}=n.options;re(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const c={apiKey:o,authDomain:a,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:DE(r)},B=new JR(n,s,i,c);return eb(B,t),B},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),nn(new Vt("auth-internal",e=>{const t=wn(e.getProvider("auth").getImmediate());return(n=>new wP(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Ot(UC,HC,TP(r)),Ot(UC,HC,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vP=5*60,RP=ip("authIdTokenMaxAge")||vP;let jC=null;const bP=r=>async e=>{const t=e&&await e.getIdTokenResult(),n=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(n&&n>RP)return;const s=t?.token;jC!==s&&(jC=s,await fetch(r,{method:s?"POST":"DELETE",headers:s?{Authorization:`Bearer ${s}`}:{}}))};function b0(r=GB()){const e=Br(r,"auth");if(e.isInitialized())return e.getImmediate();const t=ZR(r,{popupRedirectResolver:yP,persistence:[Fb,Ib,OE]}),n=ip("authTokenSyncURL");if(n&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(n,location.origin);if(location.origin===i.origin){const o=bP(i.toString());Eb(t,o,()=>o(t.currentUser)),mb(t,a=>o(a))}}const s=rp("auth");return s&&tb(t,`http://${s}`),t}function PP(){return document.getElementsByTagName("head")?.[0]??document}KR({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=s=>{const i=Zt("internal-error");i.customData=s,t(i)},n.type="text/javascript",n.charset="UTF-8",PP().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});AP("Browser");const GE="@firebase/installations",ch="0.6.24";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UE=1e4,HE=`w:${ch}`,jE="FIS_v2",SP="https://firebaseinstallations.googleapis.com/v1",OP=60*60*1e3,NP="installations",FP="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LP={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},$r=new Wr(NP,FP,LP);function qE(r){return r instanceof Mt&&r.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function JE({projectId:r}){return`${SP}/projects/${r}/installations`}function KE(r){return{token:r.token,requestStatus:2,expiresIn:VP(r.expiresIn),creationTime:Date.now()}}async function zE(r,e){const n=(await e.json()).error;return $r.create("request-failed",{requestName:r,serverCode:n.code,serverMessage:n.message,serverStatus:n.status})}function $E({apiKey:r}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":r})}function xP(r,{refreshToken:e}){const t=$E(r);return t.append("Authorization",kP(e)),t}async function QE(r){const e=await r();return e.status>=500&&e.status<600?r():e}function VP(r){return Number(r.replace("s","000"))}function kP(r){return`${jE} ${r}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function MP({appConfig:r,heartbeatServiceProvider:e},{fid:t}){const n=JE(r),s=$E(r),i=e.getImmediate({optional:!0});if(i){const B=await i.getHeartbeatsHeader();B&&s.append("x-firebase-client",B)}const o={fid:t,authVersion:jE,appId:r.appId,sdkVersion:HE},a={method:"POST",headers:s,body:JSON.stringify(o)},c=await QE(()=>fetch(n,a));if(c.ok){const B=await c.json();return{fid:B.fid||t,registrationStatus:2,refreshToken:B.refreshToken,authToken:KE(B.authToken)}}else throw await zE("Create Installation",c)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function WE(r){return new Promise(e=>{setTimeout(e,r)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GP(r){return btoa(String.fromCharCode(...r)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const UP=/^[cdef][\w-]{21}$/,OB="";function HP(){try{const r=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(r),r[0]=112+r[0]%16;const t=jP(r);return UP.test(t)?t:OB}catch{return OB}}function jP(r){return GP(r).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ku(r){return`${r.appName}!${r.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YE=new Map;function XE(r,e){const t=Ku(r);ZE(t,e),qP(t,e)}function ZE(r,e){const t=YE.get(r);if(t)for(const n of t)n(e)}function qP(r,e){const t=JP();t&&t.postMessage({key:r,fid:e}),KP()}let Nr=null;function JP(){return!Nr&&"BroadcastChannel"in self&&(Nr=new BroadcastChannel("[Firebase] FID Change"),Nr.onmessage=r=>{ZE(r.data.key,r.data.fid)}),Nr}function KP(){YE.size===0&&Nr&&(Nr.close(),Nr=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zP="firebase-installations-database",$P=1,Qr="firebase-installations-store";let Mc=null;function Bh(){return Mc||(Mc=dp(zP,$P,{upgrade:(r,e)=>{switch(e){case 0:r.createObjectStore(Qr)}}})),Mc}async function uu(r,e){const t=Ku(r),s=(await Bh()).transaction(Qr,"readwrite"),i=s.objectStore(Qr),o=await i.get(t);return await i.put(e,t),await s.done,(!o||o.fid!==e.fid)&&XE(r,e.fid),e}async function e_(r){const e=Ku(r),n=(await Bh()).transaction(Qr,"readwrite");await n.objectStore(Qr).delete(e),await n.done}async function zu(r,e){const t=Ku(r),s=(await Bh()).transaction(Qr,"readwrite"),i=s.objectStore(Qr),o=await i.get(t),a=e(o);return a===void 0?await i.delete(t):await i.put(a,t),await s.done,a&&(!o||o.fid!==a.fid)&&XE(r,a.fid),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lh(r){let e;const t=await zu(r.appConfig,n=>{const s=QP(n),i=WP(r,s);return e=i.registrationPromise,i.installationEntry});return t.fid===OB?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function QP(r){const e=r||{fid:HP(),registrationStatus:0};return t_(e)}function WP(r,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject($r.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},n=YP(r,t);return{installationEntry:t,registrationPromise:n}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:XP(r)}:{installationEntry:e}}async function YP(r,e){try{const t=await MP(r,e);return uu(r.appConfig,t)}catch(t){throw qE(t)&&t.customData.serverCode===409?await e_(r.appConfig):await uu(r.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function XP(r){let e=await qC(r.appConfig);for(;e.registrationStatus===1;)await WE(100),e=await qC(r.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:n}=await lh(r);return n||t}return e}function qC(r){return zu(r,e=>{if(!e)throw $r.create("installation-not-found");return t_(e)})}function t_(r){return ZP(r)?{fid:r.fid,registrationStatus:0}:r}function ZP(r){return r.registrationStatus===1&&r.registrationTime+UE<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eS({appConfig:r,heartbeatServiceProvider:e},t){const n=tS(r,t),s=xP(r,t),i=e.getImmediate({optional:!0});if(i){const B=await i.getHeartbeatsHeader();B&&s.append("x-firebase-client",B)}const o={installation:{sdkVersion:HE,appId:r.appId}},a={method:"POST",headers:s,body:JSON.stringify(o)},c=await QE(()=>fetch(n,a));if(c.ok){const B=await c.json();return KE(B)}else throw await zE("Generate Auth Token",c)}function tS(r,{fid:e}){return`${JE(r)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hh(r,e=!1){let t;const n=await zu(r.appConfig,i=>{if(!n_(i))throw $r.create("not-registered");const o=i.authToken;if(!e&&sS(o))return i;if(o.requestStatus===1)return t=nS(r,e),i;{if(!navigator.onLine)throw $r.create("app-offline");const a=oS(i);return t=rS(r,a),a}});return t?await t:n.authToken}async function nS(r,e){let t=await JC(r.appConfig);for(;t.authToken.requestStatus===1;)await WE(100),t=await JC(r.appConfig);const n=t.authToken;return n.requestStatus===0?hh(r,e):n}function JC(r){return zu(r,e=>{if(!n_(e))throw $r.create("not-registered");const t=e.authToken;return aS(t)?{...e,authToken:{requestStatus:0}}:e})}async function rS(r,e){try{const t=await eS(r,e),n={...e,authToken:t};return await uu(r.appConfig,n),t}catch(t){if(qE(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await e_(r.appConfig);else{const n={...e,authToken:{requestStatus:0}};await uu(r.appConfig,n)}throw t}}function n_(r){return r!==void 0&&r.registrationStatus===2}function sS(r){return r.requestStatus===2&&!iS(r)}function iS(r){const e=Date.now();return e<r.creationTime||r.creationTime+r.expiresIn<e+OP}function oS(r){const e={requestStatus:1,requestTime:Date.now()};return{...r,authToken:e}}function aS(r){return r.requestStatus===1&&r.requestTime+UE<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function uS(r){const e=r,{installationEntry:t,registrationPromise:n}=await lh(e);return n?n.catch(console.error):hh(e).catch(console.error),t.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function cS(r,e=!1){const t=r;return await BS(t),(await hh(t,e)).token}async function BS(r){const{registrationPromise:e}=await lh(r);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lS(r){if(!r||!r.options)throw Gc("App Configuration");if(!r.name)throw Gc("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!r.options[t])throw Gc(t);return{appName:r.name,projectId:r.options.projectId,apiKey:r.options.apiKey,appId:r.options.appId}}function Gc(r){return $r.create("missing-app-config-values",{valueName:r})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const r_="installations",hS="installations-internal",dS=r=>{const e=r.getProvider("app").getImmediate(),t=lS(e),n=Br(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:n,_delete:()=>Promise.resolve()}},fS=r=>{const e=r.getProvider("app").getImmediate(),t=Br(e,r_).getImmediate();return{getId:()=>uS(t),getToken:s=>cS(t,s)}};function CS(){nn(new Vt(r_,dS,"PUBLIC")),nn(new Vt(hS,fS,"PRIVATE"))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */CS();Ot(GE,ch);Ot(GE,ch,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cu="analytics",pS="firebase_id",gS="origin",mS=60*1e3,ES="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",dh="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $e=new hu("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _S={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},wt=new Wr("analytics","Analytics",_S);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function DS(r){if(!r.startsWith(dh)){const e=wt.create("invalid-gtag-resource",{gtagURL:r});return $e.warn(e.message),""}return r}function s_(r){return Promise.all(r.map(e=>e.catch(t=>t)))}function IS(r,e){let t;return window.trustedTypes&&(t=window.trustedTypes.createPolicy(r,e)),t}function yS(r,e){const t=IS("firebase-js-sdk-policy",{createScriptURL:DS}),n=document.createElement("script"),s=`${dh}?l=${r}&id=${e}`;n.src=t?t?.createScriptURL(s):s,n.async=!0,document.head.appendChild(n)}function wS(r){let e=[];return Array.isArray(window[r])?e=window[r]:window[r]=e,e}async function TS(r,e,t,n,s,i){const o=n[s];try{if(o)await e[o];else{const c=(await s_(t)).find(B=>B.measurementId===s);c&&await e[c.appId]}}catch(a){$e.error(a)}r("config",s,i)}async function AS(r,e,t,n,s){try{let i=[];if(s&&s.send_to){let o=s.send_to;Array.isArray(o)||(o=[o]);const a=await s_(t);for(const c of o){const B=a.find(d=>d.measurementId===c),h=B&&e[B.appId];if(h)i.push(h);else{i=[];break}}}i.length===0&&(i=Object.values(e)),await Promise.all(i),r("event",n,s||{})}catch(i){$e.error(i)}}function vS(r,e,t,n){async function s(i,...o){try{if(i==="event"){const[a,c]=o;await AS(r,e,t,a,c)}else if(i==="config"){const[a,c]=o;await TS(r,e,t,n,a,c)}else if(i==="consent"){const[a,c]=o;r("consent",a,c)}else if(i==="get"){const[a,c,B]=o;r("get",a,c,B)}else if(i==="set"){const[a]=o;r("set",a)}else r(i,...o)}catch(a){$e.error(a)}}return s}function RS(r,e,t,n,s){let i=function(...o){window[n].push(arguments)};return window[s]&&typeof window[s]=="function"&&(i=window[s]),window[s]=vS(i,r,e,t),{gtagCore:i,wrappedGtag:window[s]}}function bS(r){const e=window.document.getElementsByTagName("script");for(const t of Object.values(e))if(t.src&&t.src.includes(dh)&&t.src.includes(r))return t;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const PS=30,SS=1e3;class OS{constructor(e={},t=SS){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const i_=new OS;function NS(r){return new Headers({Accept:"application/json","x-goog-api-key":r})}async function FS(r){const{appId:e,apiKey:t}=r,n={method:"GET",headers:NS(t)},s=ES.replace("{app-id}",e),i=await fetch(s,n);if(i.status!==200&&i.status!==304){let o="";try{const a=await i.json();a.error?.message&&(o=a.error.message)}catch{}throw wt.create("config-fetch-failed",{httpStatus:i.status,responseMessage:o})}return i.json()}async function LS(r,e=i_,t){const{appId:n,apiKey:s,measurementId:i}=r.options;if(!n)throw wt.create("no-app-id");if(!s){if(i)return{measurementId:i,appId:n};throw wt.create("no-api-key")}const o=e.getThrottleMetadata(n)||{backoffCount:0,throttleEndTimeMillis:Date.now()},a=new kS;return setTimeout(async()=>{a.abort()},mS),o_({appId:n,apiKey:s,measurementId:i},o,a,e)}async function o_(r,{throttleEndTimeMillis:e,backoffCount:t},n,s=i_){const{appId:i,measurementId:o}=r;try{await xS(n,e)}catch(a){if(o)return $e.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${a?.message}]`),{appId:i,measurementId:o};throw a}try{const a=await FS(r);return s.deleteThrottleMetadata(i),a}catch(a){const c=a;if(!VS(c)){if(s.deleteThrottleMetadata(i),o)return $e.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${o} provided in the "measurementId" field in the local Firebase config. [${c?.message}]`),{appId:i,measurementId:o};throw a}const B=Number(c?.customData?.httpStatus)===503?Id(t,s.intervalMillis,PS):Id(t,s.intervalMillis),h={throttleEndTimeMillis:Date.now()+B,backoffCount:t+1};return s.setThrottleMetadata(i,h),$e.debug(`Calling attemptFetch again in ${B} millis`),o_(r,h,n,s)}}function xS(r,e){return new Promise((t,n)=>{const s=Math.max(e-Date.now(),0),i=setTimeout(t,s);r.addEventListener(()=>{clearTimeout(i),n(wt.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function VS(r){if(!(r instanceof Mt)||!r.customData)return!1;const e=Number(r.customData.httpStatus);return e===429||e===500||e===503||e===504}class kS{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function MS(r,e,t,n,s){if(s&&s.global){r("event",t,n);return}else{const i=await e,o={...n,send_to:i};r("event",t,o)}}async function GS(r,e,t,n){{const s=await e;r("config",s,{update:!0,user_id:t})}}async function US(r,e,t,n){if(n&&n.global){const s={};for(const i of Object.keys(t))s[`user_properties.${i}`]=t[i];return r("set",s),Promise.resolve()}else{const s=await e;r("config",s,{update:!0,user_properties:t})}}async function HS(r,e){const t=await r;window[`ga-disable-${t}`]=!e}let NB;function a_(r){NB=r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jS(){if(lu())try{await VB()}catch(r){return $e.warn(wt.create("indexeddb-unavailable",{errorInfo:r?.toString()}).message),!1}else return $e.warn(wt.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function qS(r,e,t,n,s,i,o){const a=LS(r);a.then(C=>{t[C.measurementId]=C.appId,r.options.measurementId&&C.measurementId!==r.options.measurementId&&$e.warn(`The measurement ID in the local Firebase config (${r.options.measurementId}) does not match the measurement ID fetched from the server (${C.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(C=>$e.error(C)),e.push(a);const c=jS().then(C=>{if(C)return n.getId()}),[B,h]=await Promise.all([a,c]);bS(i)||yS(i,B.measurementId),NB&&(s("consent","default",NB),a_(void 0)),s("js",new Date);const d=o?.config??{};return d[gS]="firebase",d.update=!0,h!=null&&(d[pS]=h),s("config",B.measurementId,d),B.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JS{constructor(e){this.app=e}_delete(){return delete Yn[this.app.options.appId],Promise.resolve()}}let Yn={},KC=[];const zC={};let Uc="dataLayer",KS="gtag",$C,Js,QC=!1;function zS(){const r=[];if(xB()&&r.push("This is a browser extension environment."),Bp()||r.push("Cookies are not available."),r.length>0){const e=r.map((n,s)=>`(${s+1}) ${n}`).join(" "),t=wt.create("invalid-analytics-context",{errorInfo:e});$e.warn(t.message)}}function $S(r,e,t){zS();const n=r.options.appId;if(!n)throw wt.create("no-app-id");if(!r.options.apiKey)if(r.options.measurementId)$e.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${r.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw wt.create("no-api-key");if(Yn[n]!=null)throw wt.create("already-exists",{id:n});if(!QC){wS(Uc);const{wrappedGtag:i,gtagCore:o}=RS(Yn,KC,zC,Uc,KS);Js=i,$C=o,QC=!0}return Yn[n]=qS(r,KC,zC,e,$C,Uc,t),new JS(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ai(r=GB()){r=Te(r);const e=Br(r,cu);return e.isInitialized()?e.getImmediate():QS(r)}function QS(r,e={}){const t=Br(r,cu);if(t.isInitialized()){const s=t.getImmediate();if(fn(e,t.getOptions()))return s;throw wt.create("already-initialized")}return t.initialize({options:e})}async function P0(){if(xB()||!Bp()||!lu())return!1;try{return await VB()}catch{return!1}}function WS(r,e,t){r=Te(r),GS(Js,Yn[r.app.options.appId],e).catch(n=>$e.error(n))}function u_(r,e,t){r=Te(r),US(Js,Yn[r.app.options.appId],e,t).catch(n=>$e.error(n))}function YS(r,e){r=Te(r),HS(Yn[r.app.options.appId],e).catch(t=>$e.error(t))}function FB(r,e,t,n){r=Te(r),MS(Js,Yn[r.app.options.appId],e,t,n).catch(s=>$e.error(s))}function XS(r){Js?Js("consent","update",r):a_(r)}const WC="@firebase/analytics",YC="0.10.24";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZS(){nn(new Vt(cu,(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),s=e.getProvider("installations-internal").getImmediate();return $S(n,s,t)},"PUBLIC")),nn(new Vt("analytics-internal",r,"PRIVATE")),Ot(WC,YC),Ot(WC,YC,"esm2020");function r(e){try{const t=e.getProvider(cu).getImmediate();return{logEvent:(n,s,i)=>FB(t,n,s,i),setUserProperties:(n,s)=>u_(t,n,s)}}catch(t){throw wt.create("interop-component-reg-failed",{reason:t})}}}ZS();var kn;(function(r){r.AdPersonalization="AD_PERSONALIZATION",r.AdStorage="AD_STORAGE",r.AdUserData="AD_USER_DATA",r.AnalyticsStorage="ANALYTICS_STORAGE",r.FunctionalityStorage="FUNCTIONALITY_STORAGE",r.PersonalizationStorage="PERSONALIZATION_STORAGE"})(kn||(kn={}));var LB;(function(r){r.Granted="GRANTED",r.Denied="DENIED"})(LB||(LB={}));const S0=Eo("FirebaseAnalytics",{web:()=>XC(()=>Promise.resolve().then(()=>t0),void 0).then(r=>new r.FirebaseAnalyticsWeb)}),O0=Eo("FirebaseCrashlytics",{web:()=>XC(()=>Promise.resolve().then(()=>r0),void 0).then(r=>new r.FirebaseCrashlyticsWeb)});class e0 extends _o{async getAppInstanceId(){throw this.unimplemented("Not implemented on web.")}async setConsent(e){const t=e.status===LB.Granted?"granted":"denied",n={};switch(e.type){case kn.AdPersonalization:n.ad_personalization=t;break;case kn.AdStorage:n.ad_storage=t;break;case kn.AdUserData:n.ad_user_data=t;break;case kn.AnalyticsStorage:n.analytics_storage=t;break;case kn.FunctionalityStorage:n.functionality_storage=t;break;case kn.PersonalizationStorage:n.personalization_storage=t;break}XS(n)}async setUserId(e){const t=Ai();WS(t,e.userId)}async setUserProperty(e){const t=Ai();u_(t,{[e.key]:e.value})}async setCurrentScreen(e){const t=Ai();FB(t,"screen_view",{firebase_screen:e.screenName||void 0,firebase_screen_class:e.screenClassOverride||void 0})}async logEvent(e){const t=Ai();FB(t,e.name,e.params)}async logTransaction(e){throw this.unimplemented("Not implemented on web.")}async setSessionTimeoutDuration(e){throw this.unimplemented("Not implemented on web.")}async setEnabled(e){const t=Ai();YS(t,e.enabled)}async isEnabled(){return{enabled:window["ga-disable-analyticsId"]===!0}}async resetAnalyticsData(){throw this.unimplemented("Not implemented on web.")}async initiateOnDeviceConversionMeasurementWithEmailAddress(e){throw this.unimplemented("Not implemented on web.")}async initiateOnDeviceConversionMeasurementWithPhoneNumber(e){throw this.unimplemented("Not implemented on web.")}async initiateOnDeviceConversionMeasurementWithHashedEmailAddress(e){throw this.unimplemented("Not implemented on web.")}async initiateOnDeviceConversionMeasurementWithHashedPhoneNumber(e){throw this.unimplemented("Not implemented on web.")}}const t0=Object.freeze(Object.defineProperty({__proto__:null,FirebaseAnalyticsWeb:e0},Symbol.toStringTag,{value:"Module"}));class n0 extends _o{async crash(){throw this.unimplemented("Not implemented on web.")}async setCustomKey(e){throw this.unimplemented("Not implemented on web.")}async setUserId(e){throw this.unimplemented("Not implemented on web.")}async log(e){throw this.unimplemented("Not implemented on web.")}async setEnabled(e){throw this.unimplemented("Not implemented on web.")}async isEnabled(){throw this.unimplemented("Not implemented on web.")}async didCrashOnPreviousExecution(){throw this.unimplemented("Not implemented on web.")}async sendUnsentReports(){throw this.unimplemented("Not implemented on web.")}async deleteUnsentReports(){throw this.unimplemented("Not implemented on web.")}async recordException(e){throw this.unimplemented("Not implemented on web.")}}const r0=Object.freeze(Object.defineProperty({__proto__:null,FirebaseCrashlyticsWeb:n0},Symbol.toStringTag,{value:"Module"}));export{d0 as A,a0 as B,Hc as C,f0 as D,m0 as E,S0 as F,D0 as G,A0 as H,T0 as I,w0 as J,W_ as K,_o as W,XC as _,p0 as a,l0 as b,ZR as c,Fb as d,Ib as e,OE as f,h0 as g,RC as h,EI as i,b0 as j,u0 as k,E0 as l,g0 as m,I0 as n,v0 as o,C0 as p,P0 as q,Eo as r,s0 as s,Ai as t,FB as u,WS as v,O0 as w,R0 as x,y0 as y,_0 as z};
