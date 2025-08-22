"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSource = exports.ContentType = void 0;
var ContentType;
(function (ContentType) {
    ContentType["BLOG_ARTICLES"] = "blog_articles";
    ContentType["NEWS_ARTICLES"] = "news_articles";
    ContentType["SOCIAL_MEDIA"] = "social_media";
    ContentType["DIRECTORIES"] = "directories";
    ContentType["REVIEWS_ONLY"] = "reviews_only";
    ContentType["TOP_LISTS"] = "top_lists";
    ContentType["GENERIC_INFO"] = "generic_info";
})(ContentType || (exports.ContentType = ContentType = {}));
var DataSource;
(function (DataSource) {
    DataSource["GOOGLE_SEARCH"] = "google_search";
    DataSource["GOOGLE_MAPS"] = "google_maps";
    DataSource["YELP"] = "yelp";
    DataSource["YELLOW_PAGES"] = "yellow_pages";
    DataSource["CUSTOM_WEBSITE"] = "custom_website";
    DataSource["BING_SEARCH"] = "bing_search";
    DataSource["DUCKDUCKGO"] = "duckduckgo";
})(DataSource || (exports.DataSource = DataSource = {}));
//# sourceMappingURL=scraper.interface.js.map