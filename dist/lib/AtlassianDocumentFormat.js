"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtlassianDocument = void 0;
class AtlassianDocument {
    constructor(content) {
        this.type = 'doc';
        this.version = 1;
        this.content = content;
    }
    static fromUrl(url) {
        return new AtlassianDocument([
            {
                type: 'paragraph',
                content: [
                    {
                        type: 'inlineCard',
                        attrs: { url }
                    }
                ]
            }
        ]);
    }
}
exports.AtlassianDocument = AtlassianDocument;
//# sourceMappingURL=AtlassianDocumentFormat.js.map