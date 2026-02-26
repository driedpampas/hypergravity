/**
 * Analyzes a string of text to provide various readability and sizing statistics.
 * @param {string} text - The input text to analyze.
 * @returns {Object} An object containing word, character, line, sentence, paragraph, and estimated token counts.
 */
export function countText(text: string) {
    if (!text)
        return {
            words: 0,
            chars: 0,
            charsNoSpace: 0,
            lines: 0,
            sentences: 0,
            paragraphs: 0,
            tokens: 0,
        };

    const trimmed = text.trim();
    const noSpaceStr = text
        .replace(/\r\n/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '');
    const chars = noSpaceStr.length;
    const charsNoSpace = noSpaceStr.replace(/\s/g, '').length;

    let validWordMatches = 0;
    let workStr = text;

    const urls = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s]+/gi;
    validWordMatches += (workStr.match(urls) || []).length;
    workStr = workStr.replace(urls, ' ');

    const emails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    validWordMatches += (workStr.match(emails) || []).length;
    workStr = workStr.replace(emails, ' ');

    const ips = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    validWordMatches += (workStr.match(ips) || []).length;
    workStr = workStr.replace(ips, ' ');

    const paths = /[a-zA-Z0-9_-]+(?:[\/\\][a-zA-Z0-9_.-]+)+/g;
    validWordMatches += (workStr.match(paths) || []).length;
    workStr = workStr.replace(paths, ' ');

    const decimals = /\b\d+\.\d+\b/g;
    validWordMatches += (workStr.match(decimals) || []).length;
    workStr = workStr.replace(decimals, ' ');

    validWordMatches += (workStr.match(/[\w\d''-]+/gi) || []).length;

    const wordsCount = validWordMatches;
    const sentencesCount =
        (text.match(/[^\.!\?]+[\.!\?]+/g) || []).length ||
        (wordsCount > 0 ? 1 : 0);

    const linesCountRaw = trimmed
        .replace(/\r?\n\r?\n+/g, '\n\n')
        .split(/\r?\n/)
        .filter((e: string) => e !== '').length;
    const linesCount = trimmed.length === 0 ? 0 : Math.max(1, linesCountRaw);

    const paragraphsCount =
        trimmed.length === 0
            ? 0
            : trimmed
                .split(/(?:\r?\n){3,}/)
                .filter((e: string) => e.trim().length > 0)
                  .length;

    const punctuationCount = (text.match(/[^\w\s]/g) || []).length;
    const tokens = Math.ceil(
        wordsCount +
            0.5 * punctuationCount +
            0.3 * (charsNoSpace / 4 - wordsCount)
    );

    return {
        words: wordsCount,
        chars: chars,
        charsNoSpace: charsNoSpace,
        lines: linesCount,
        sentences: sentencesCount,
        paragraphs: paragraphsCount,
        tokens: Math.max(0, tokens),
    };
}
