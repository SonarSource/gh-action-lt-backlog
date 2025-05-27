"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtlassianDocument = void 0;
class AtlassianDocument {
    type = 'doc';
    version = 1;
    content;
    constructor(content) {
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