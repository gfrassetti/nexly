/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/stripe/subscription-info/route";
exports.ids = ["app/api/stripe/subscription-info/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fsubscription-info%2Froute&page=%2Fapi%2Fstripe%2Fsubscription-info%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fsubscription-info%2Froute.ts&appDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fsubscription-info%2Froute&page=%2Fapi%2Fstripe%2Fsubscription-info%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fsubscription-info%2Froute.ts&appDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_Guido_Desktop_Guido_Nexly_web_src_app_api_stripe_subscription_info_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/stripe/subscription-info/route.ts */ \"(rsc)/./src/app/api/stripe/subscription-info/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/stripe/subscription-info/route\",\n        pathname: \"/api/stripe/subscription-info\",\n        filename: \"route\",\n        bundlePath: \"app/api/stripe/subscription-info/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\Guido\\\\Desktop\\\\Guido\\\\Nexly\\\\web\\\\src\\\\app\\\\api\\\\stripe\\\\subscription-info\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_Guido_Desktop_Guido_Nexly_web_src_app_api_stripe_subscription_info_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZzdHJpcGUlMkZzdWJzY3JpcHRpb24taW5mbyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGc3RyaXBlJTJGc3Vic2NyaXB0aW9uLWluZm8lMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZzdHJpcGUlMkZzdWJzY3JpcHRpb24taW5mbyUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNHdWlkbyU1Q0Rlc2t0b3AlNUNHdWlkbyU1Q05leGx5JTVDd2ViJTVDc3JjJTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDVXNlcnMlNUNHdWlkbyU1Q0Rlc2t0b3AlNUNHdWlkbyU1Q05leGx5JTVDd2ViJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUNnRDtBQUM3SDtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZWIvP2M4ZjciXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXEd1aWRvXFxcXERlc2t0b3BcXFxcR3VpZG9cXFxcTmV4bHlcXFxcd2ViXFxcXHNyY1xcXFxhcHBcXFxcYXBpXFxcXHN0cmlwZVxcXFxzdWJzY3JpcHRpb24taW5mb1xcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvc3RyaXBlL3N1YnNjcmlwdGlvbi1pbmZvL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvc3RyaXBlL3N1YnNjcmlwdGlvbi1pbmZvXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9zdHJpcGUvc3Vic2NyaXB0aW9uLWluZm8vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxHdWlkb1xcXFxEZXNrdG9wXFxcXEd1aWRvXFxcXE5leGx5XFxcXHdlYlxcXFxzcmNcXFxcYXBwXFxcXGFwaVxcXFxzdHJpcGVcXFxcc3Vic2NyaXB0aW9uLWluZm9cXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fsubscription-info%2Froute&page=%2Fapi%2Fstripe%2Fsubscription-info%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fsubscription-info%2Froute.ts&appDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./src/app/api/stripe/subscription-info/route.ts":
/*!*******************************************************!*\
  !*** ./src/app/api/stripe/subscription-info/route.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n// Este endpoint actúa como proxy al backend de Express\nasync function GET(request) {\n    try {\n        const backendUrl = \"https://nexly-production.up.railway.app\" || 0;\n        // Forward the request to the Express backend\n        const response = await fetch(`${backendUrl}/stripe/subscription-info`, {\n            method: 'GET',\n            headers: {\n                'Authorization': request.headers.get('Authorization') || '',\n                'Content-Type': 'application/json'\n            }\n        });\n        if (!response.ok) {\n            const errorData = await response.json();\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(errorData, {\n                status: response.status\n            });\n        }\n        const data = await response.json();\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data);\n    } catch (error) {\n        console.error('Error in subscription-info proxy:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Error interno del servidor'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9zdHJpcGUvc3Vic2NyaXB0aW9uLWluZm8vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBd0Q7QUFFeEQsdURBQXVEO0FBQ2hELGVBQWVDLElBQUlDLE9BQW9CO0lBQzVDLElBQUk7UUFDRixNQUFNQyxhQUFhQyx5Q0FBK0IsSUFBSSxDQUF5QztRQUUvRiw2Q0FBNkM7UUFDN0MsTUFBTUcsV0FBVyxNQUFNQyxNQUFNLEdBQUdMLFdBQVcseUJBQXlCLENBQUMsRUFBRTtZQUNyRU0sUUFBUTtZQUNSQyxTQUFTO2dCQUNQLGlCQUFpQlIsUUFBUVEsT0FBTyxDQUFDQyxHQUFHLENBQUMsb0JBQW9CO2dCQUN6RCxnQkFBZ0I7WUFDbEI7UUFDRjtRQUVBLElBQUksQ0FBQ0osU0FBU0ssRUFBRSxFQUFFO1lBQ2hCLE1BQU1DLFlBQVksTUFBTU4sU0FBU08sSUFBSTtZQUNyQyxPQUFPZCxxREFBWUEsQ0FBQ2MsSUFBSSxDQUFDRCxXQUFXO2dCQUFFRSxRQUFRUixTQUFTUSxNQUFNO1lBQUM7UUFDaEU7UUFFQSxNQUFNQyxPQUFPLE1BQU1ULFNBQVNPLElBQUk7UUFDaEMsT0FBT2QscURBQVlBLENBQUNjLElBQUksQ0FBQ0U7SUFDM0IsRUFBRSxPQUFPQyxPQUFPO1FBQ2RDLFFBQVFELEtBQUssQ0FBQyxxQ0FBcUNBO1FBQ25ELE9BQU9qQixxREFBWUEsQ0FBQ2MsSUFBSSxDQUN0QjtZQUFFRyxPQUFPO1FBQTZCLEdBQ3RDO1lBQUVGLFFBQVE7UUFBSTtJQUVsQjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd2ViLy4vc3JjL2FwcC9hcGkvc3RyaXBlL3N1YnNjcmlwdGlvbi1pbmZvL3JvdXRlLnRzPzM0OGEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcclxuXHJcbi8vIEVzdGUgZW5kcG9pbnQgYWN0w7phIGNvbW8gcHJveHkgYWwgYmFja2VuZCBkZSBFeHByZXNzXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQocmVxdWVzdDogTmV4dFJlcXVlc3QpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgYmFja2VuZFVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQSV9VUkwgfHwgJ2h0dHBzOi8vbmV4bHktcHJvZHVjdGlvbi51cC5yYWlsd2F5LmFwcCc7XHJcbiAgICBcclxuICAgIC8vIEZvcndhcmQgdGhlIHJlcXVlc3QgdG8gdGhlIEV4cHJlc3MgYmFja2VuZFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYWNrZW5kVXJsfS9zdHJpcGUvc3Vic2NyaXB0aW9uLWluZm9gLCB7XHJcbiAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6IHJlcXVlc3QuaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSB8fCAnJyxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihlcnJvckRhdGEsIHsgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihkYXRhKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gc3Vic2NyaXB0aW9uLWluZm8gcHJveHk6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxyXG4gICAgICB7IGVycm9yOiAnRXJyb3IgaW50ZXJubyBkZWwgc2Vydmlkb3InIH0sXHJcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsIkdFVCIsInJlcXVlc3QiLCJiYWNrZW5kVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX0FQSV9VUkwiLCJyZXNwb25zZSIsImZldGNoIiwibWV0aG9kIiwiaGVhZGVycyIsImdldCIsIm9rIiwiZXJyb3JEYXRhIiwianNvbiIsInN0YXR1cyIsImRhdGEiLCJlcnJvciIsImNvbnNvbGUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/stripe/subscription-info/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fsubscription-info%2Froute&page=%2Fapi%2Fstripe%2Fsubscription-info%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fsubscription-info%2Froute.ts&appDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGuido%5CDesktop%5CGuido%5CNexly%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();