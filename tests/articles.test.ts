import test from 'node:test';
import assert from 'node:assert/strict';
import {getAllArticles, getArticleBySlug, getArticleRelations, getArticlesByCategory, getRelatedArticles} from '../lib/articles';
import {locales} from '../lib/i18n';

test('all localized articles are parseable, unique and sorted', () => {
  for (const locale of locales) {
    const articles = getAllArticles(locale);
    assert.ok(articles.length > 0, `${locale} must contain articles`);
    assert.equal(new Set(articles.map((article) => article.slug)).size, articles.length, `${locale} slugs must be unique`);
    for (let index = 1; index < articles.length; index += 1) assert.ok(+new Date(articles[index - 1].date) >= +new Date(articles[index].date), `${locale} must be sorted by date`);
    for (const article of articles) {
      assert.ok(article.category);
      assert.ok(article.body.trim());
      assert.ok(article.readingTime > 0);
    }
  }
});

test('discovery helpers and editorial relations preserve their invariants', () => {
  const all = getAllArticles('es');
  assert.ok(getArticleBySlug(all[0].slug));
  assert.equal(getArticleBySlug('does-not-exist'), undefined);
  assert.ok(getArticlesByCategory(all[0].category).length > 0);
  assert.ok(getRelatedArticles(all[0]).every((article) => article.slug !== all[0].slug));
  for (const article of all) for (const relation of getArticleRelations(article)) {
    assert.notEqual(relation.slug, article.slug);
    assert.ok(getArticleBySlug(relation.slug), `${article.slug} relation target must exist`);
  }
});
