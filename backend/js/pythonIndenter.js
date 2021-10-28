/* Copyright (c) 2021-present Tomra Systems ASA */
const getIndentedLine = (lineContent) => {
    let spaceCt = 0;
    let tabCt = 0;
    let tabPadding = "";

    if (lineContent.startsWith("\t")) {
        lineContent = lineContent.replace(/\t/g, "    ");
    }

    if (lineContent.startsWith("    ")) {
        for (let c of lineContent) {
            if (c === " ") {
                spaceCt++;
            } else {
                break;
            }
        }
    }

    if (spaceCt > 0) {
        tabCt = spaceCt / 4;
        if (tabCt >= 1) {
            for (let i = 0; i < tabCt; i++) {
                tabPadding += "\t";
            }
        }
    }

    return `${tabPadding}${lineContent.trim()}\n`;
}

module.exports = {
    getIndentedLine: getIndentedLine
};
