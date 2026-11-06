import { Spinner } from './components/ui';
import { IS_LOCAL, useData } from './data';
import { CatalogPage } from './pages/CatalogPage';
import { ComparePage } from './pages/ComparePage';
import { ThemePage } from './pages/ThemePage';
import { Link, useRoute } from './router';

export function App() {
  const route = useRoute();
  const { db, error, toasts } = useData();

  let page;
  if (!db && error) page = <p className="callout danger">Não consegui carregar o conteúdo: {error}</p>;
  else if (!db)
    page = (
      <p className="generating">
        <Spinner /> Carregando…
      </p>
    );
  else if (route.path.startsWith('/tema/')) page = <ThemePage id={route.path.slice('/tema/'.length)} />;
  else if (route.path === '/modelos') page = <ComparePage />;
  else page = <CatalogPage query={route.query} />;

  const isCompare = route.path === '/modelos';

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            🎓 Educaflix <span>admin</span>
          </Link>
          <nav>
            <Link to="/" className={!isCompare ? 'active' : ''}>
              Conteúdo
            </Link>
            <Link to="/modelos" className={isCompare ? 'active' : ''}>
              <span className="hide-sm">Comparar modelos</span>
              <span className="show-sm">Modelos</span>
            </Link>
          </nav>
          <span className={`mode mode-${IS_LOCAL ? 'local' : 'published'}`}>{IS_LOCAL ? 'Modo local' : 'Somente leitura'}</span>
        </div>
      </header>
      {!IS_LOCAL && (
        <div className="readonly-banner">
          <div className="container">
            <strong>Modo publicado, somente leitura.</strong> Aqui você vê todo o conteúdo gerado e o estado de cada etapa. Os botões de
            gerar e aprovar só funcionam no modo local (<code>npm run dev</code>).
          </div>
        </div>
      )}
      {IS_LOCAL && error && db && (
        <div className="readonly-banner danger">
          <div className="container">{error}</div>
        </div>
      )}
      <main className="container">{page}</main>
      <footer className="container footer muted small">
        Educaflix (nome temporário) · demo do admin · conteúdo de exemplo baseado na BNCC
      </footer>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
