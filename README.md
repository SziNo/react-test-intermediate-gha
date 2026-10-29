# React Test Workflow – Intermediate GitHub Actions gyakorló projekt

![Test React App (Intermediate)](https://github.com/SziNo/react-test-intermediate-gha/actions/workflows/test.yml/badge.svg)

Egy Vite-tal generált React alkalmazás, amelynek tesztjei GitHub Actionsben futnak. Az előző, alap workflow-t ez a projekt kiegészíti haladóbb funkciókkal:

- **Event filterek**: csak a `main` branch-en és csak az `src/` mappa változásakor fut.
- **Context**: kiírja a branch-et, a commit SHA-t és az eseményt a `github` contextből.
- **Változók**: `env` workflow, job és step szinten.
- **Feltételek**: `if` kifejezésekkel futó vagy kihagyott lépések.
- **Kifejezések**: alapértelmezett érték a `||` operátorral.

A README egyben lépésről lépésre követhető leírás is, amivel egy hasonló projekt nulláról felállítható.

## Technológiák

| Eszköz                           | Verzió | Mire való                                       |
| -------------------------------- | ------ | ----------------------------------------------- |
| Node.js (nvm-mel kezelve)        | 24 LTS | JavaScript futtatókörnyezet                     |
| Vite                             | 8      | Projektgenerálás, fejlesztői szerver, build     |
| React                            | 19     | UI könyvtár                                     |
| Vitest                           | 5      | Tesztfuttató                                    |
| React Testing Library + jest-dom | –      | Komponensek renderelése és ellenőrzése tesztben |
| jsdom                            | –      | Szimulált böngésző Node alatt                   |
| GitHub Actions                   | –      | CI: a tesztek automatikus futtatása             |

Fejlesztői környezet: WSL2, Ubuntu 24.

---

## 1. A projekt létrehozása template-ből

Ez a repó az előző feladat repójából (`react-test-github-actions-workflow`) készült, amely **Template repository**-ként van beállítva (Settings → General).

1. Az eredeti repó oldalán: **Use this template → Create a new repository**.
2. Klónozás SSH-val, telepítés, próbafuttatás:

```bash
cd ~/codecool/GithubActions
git clone git@github.com:SziNo/react-test-intermediate-gha.git
cd react-test-intermediate-gha
npm install
npm test
```

3. A `package.json`-ban a `"name"` mezőt átírni az új projekt nevére, a README-ben pedig a badge-et és a repóneveket frissíteni.

A template-ből készült repó egyetlen kezdő committal indul, a régi commit-történet nem jön át.

---

## 2. Egyszeri környezetbeállítás (WSL2)

Ha a gép már be van állítva, ez a rész átugorható.

### 2.1 Git azonosító

```bash
git config --global user.name "Neved"
git config --global user.email "te@emailed.hu"
```

### 2.2 SSH kulcs a GitHubhoz

A WSL-nek saját `~/.ssh` mappája van, a Windows alatti kulcsok itt nem számítanak.

```bash
ssh-keygen -t ed25519 -C "te@emailed.hu"   # Enter az útvonalnál
cat ~/.ssh/id_ed25519.pub                  # ezt a sort kell kimásolni
```

A publikus kulcsot a GitHubon a **Settings → SSH and GPG keys → New SSH key** menüpontban kell hozzáadni. Ellenőrzés:

```bash
ssh -T git@github.com
# Hi <felhasználónév>! You've successfully authenticated, but GitHub does not provide shell access.
```

> A privát kulcsot (`id_ed25519`, `.pub` nélkül) soha nem adjuk ki senkinek.

### 2.3 Node.js nvm-mel

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
nvm alias default 24
```

A projekt gyökerében lévő `.nvmrc` fájl (tartalma: `24`) rögzíti a verziót: lokálisan az `nvm use`, a CI-ban a `setup-node` olvassa.

---

## 3. A React app és a tesztek (nulláról)

Ha nem template-ből indulunk, így állítható fel az alap.

### 3.1 Vite projekt

```bash
npm create vite@latest . -- --template react
```

| Kérdés                          | Válasz                        |
| ------------------------------- | ----------------------------- |
| Current directory is not empty  | **Ignore files and continue** |
| Which linter to use?            | ESLint                        |
| Install with npm and start now? | No                            |

```bash
npm install
npm run dev     # http://localhost:5173/  →  leállítás: Ctrl+C
```

### 3.2 Vitest és Testing Library

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
```

`src/setupTests.js`:

```js
import "@testing-library/jest-dom/vitest";
```

`package.json` → `scripts`:

```json
"test": "vitest run"
```

A `run` miatt a Vitest egyszer lefut és kilép (nem marad watch módban).

### 3.3 A teszt: `src/App.test.jsx`

```jsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the main heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: /get started/i }),
    ).toBeInTheDocument();
  });

  it("starts the counter at 0", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /count is 0/i }),
    ).toBeInTheDocument();
  });

  it("increments the counter on click", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /count is/i });
    fireEvent.click(button);
    expect(button).toHaveTextContent("Count is 1");
  });
});
```

```bash
npm test        # Tests  3 passed (3)
npm run lint    # ha nem ír ki semmit, nincs hiba
```

---

## 4. A workflow

Fájl: `.github/workflows/test.yml`

```yaml
name: Test React App (Intermediate)

on:
  push:
    branches: [main]
    paths:
      - src/**
  pull_request:
    branches: [main]
    paths:
      - src/**

env:
  APP_NAME: "React App"

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NODE_VERSION: "18"
    steps:
      - name: Check out repository code
        uses: actions/checkout@v5

      - name: Display the branch name
        run: |
          echo "Ref: ${{ github.ref }}"
          echo "Branch name: ${{ github.ref_name }}"

      - name: Display the commit SHA
        run: |
          echo "Commit SHA: ${{ github.sha }}"

      - name: Display the event name
        run: |
          echo "Event name: ${{ github.event_name }}"

      - name: Display variables
        env:
          TEST_FLAG: "true"
        run: |
          echo "APP_NAME (workflow): ${{ env.APP_NAME }}"
          echo "NODE_VERSION (job): ${{ env.NODE_VERSION }}"
          echo "TEST_FLAG (step): ${{ env.TEST_FLAG }}"

      - name: Push event message
        if: github.event_name == 'push'
        run: echo "This is a push event"

      - name: Pull request event message
        if: github.event_name == 'pull_request'
        run: echo "This is a pull request event"

      - name: Display extra flag
        run: |
          echo "EXTRA_FLAG: ${{ env.EXTRA_FLAG || 'none' }}"

      - name: Set up Node.js
        uses: actions/setup-node@v5
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - name: Install dependencies
        run: npm install

      - name: Run tests
        if: ${{ !contains(github.event.head_commit.message, '[skip-tests]')}}
        run: npm test
```

### 4.1 Az alaplépések

| Lépés                    | Miért kell                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `actions/checkout`       | A runner üres géppel indul, a repó kódja nincs rajta. A checkout klónozza le. Azért nem automatikus, mert nem minden workflow-nak kell a kód, és így paraméterezhető is (branch, `fetch-depth`, másik repó). |
| `actions/setup-node`     | A runneren lévő Node verziója bármikor változhat. Ez telepíti a kért verziót (a `.nvmrc` alapján 24) a hozzá tartozó npm-mel. A `cache: "npm"` a futások között megőrzi a letöltött csomagokat.              |
| `npm install` / `npm ci` | A függőségek telepítése (lásd a 4.7-es pontot).                                                                                                                                                              |
| `npm test`               | A tesztek futtatása. Bukó teszt esetén 1-es kilépési kód, amitől a job piros lesz.                                                                                                                           |

### 4.2 Event filterek

```yaml
on:
  push:
    branches: [main]
    paths:
      - src/**
```

- Egy eseményen belül a `branches` és a `paths` **ÉS** kapcsolatban áll: a `main`-re kell érkeznie, **és** az `src/` alatt kell változnia valaminek.
- A `src/**` jelentése: az `src` mappa és bármilyen mélységű almappája.
- A `pull_request` alatt a `branches: [main]` a PR **cél** branch-ére szűr.
- A tömbös forma (`on: [push, pull_request]`) is működik, de abban nem adható meg szűrő.

### 4.3 Context

| Kifejezés           | Push a `main`-re  | Pull request                |
| ------------------- | ----------------- | --------------------------- |
| `github.ref`        | `refs/heads/main` | `refs/pull/1/merge`         |
| `github.ref_name`   | `main`            | `1/merge`                   |
| `github.sha`        | a pusholt commit  | egy ideiglenes merge commit |
| `github.event_name` | `push`            | `pull_request`              |

**Miért `refs/pull/1/merge` PR-nál?** A GitHub a PR-nál egy ideiglenes merge commitot készít (a PR branch beolvasztva a `main`-be), és azon futtatja a workflow-t. Így azt ellenőrzi, hogy a mergelés **utáni** állapot működik-e. Az `1` a PR sorszáma. Ezért más a SHA is, mint a branch utolsó commitjáé.

A valódi branch-nevek PR-nál: `github.head_ref` (forrás, pl. `feature-test`) és `github.base_ref` (cél, pl. `main`). Ezek csak PR eseményeknél léteznek.

### 4.4 Változók és hatókörük

| Szint    | Hol adjuk meg           | Hol látszik                    |
| -------- | ----------------------- | ------------------------------ |
| Workflow | a fájl tetején, `env:`  | minden jobban, minden lépésben |
| Job      | `jobs.<job>.env`        | csak abban a jobban            |
| Step     | a lépésen belül, `env:` | **csak abban az egy lépésben** |

Ezért kell a `TEST_FLAG`-et pontosan abba a lépésbe tenni, amelyik mindhárom változót kiírja.

Kiolvasásuk: `${{ env.VALTOZO }}`. A `${{ }}` közötti kifejezést a GitHub még a parancs futtatása előtt behelyettesíti.

**A `NODE_VERSION: "18"` csak megjelenítésre szolgál.** A feladat ezt az értéket kéri, de a Vite 8-nak legalább Node 20.19 kell, a Node 18 pedig EOL. A tényleges Node verziót a `setup-node` a `.nvmrc`-ből veszi (24). A logban ez látszik is: `Resolved .nvmrc as 24`.

### 4.5 Feltételes lépések

```yaml
- name: Push event message
  if: github.event_name == 'push'
  run: echo "This is a push event"
```

- Az `if` értékét a GitHub magától kifejezésként értelmezi, így ott a `${{ }}` elhagyható.
- **Kivétel:** ha a kifejezés `!`-lel kezdődik, a `${{ }}` kötelező, mert a `!` a YAML-ben speciális karakter (tag):

```yaml
if: ${{ !contains(github.event.head_commit.message, '[skip-tests]') }}
```

- A `github.event.head_commit` csak push eseménynél létezik. PR-nál üres, ezért a `contains` hamis, és a teszt lefut.
- A kihagyott lépés az Actions felületén **szürke, áthúzott kör** ikonnal jelenik meg. Nem lehet lenyitni, mert nem futott, és nem számít hibának: a workflow zöld marad.

**`[skip-tests]` vs. `[skip ci]`:** a `[skip ci]` a GitHub beépített kulcsszava, ami az **egész workflow-t** kihagyja. A `[skip-tests]` a saját `if` feltételünk: a workflow lefut, csak a teszt lépés marad ki.

### 4.6 Alapértelmezett érték

```yaml
run: |
  echo "EXTRA_FLAG: ${{ env.EXTRA_FLAG || 'none' }}"
```

A `||` az első „igaz” értéket adja vissza. Mivel az `EXTRA_FLAG` nincs beállítva (üres), az eredmény `none`.

### 4.7 `npm install` vagy `npm ci`?

A CI-ba az `npm ci` a jobb választás:

- szigorúan a `package-lock.json` alapján, pontosan ugyanazokat a verziókat telepíti,
- hibával leáll, ha a `package.json` és a lock fájl nincs szinkronban,
- mindig tiszta `node_modules`-szal indul, és nem módosítja a lock fájlt,
- általában gyorsabb.

Feltétele, hogy a `package-lock.json` a repóban legyen. Ökölszabály: lokálisan új csomaghoz `npm install`, a CI-ban `npm ci`.

---

## 5. Tesztelés

Fontos szabály: mivel a workflow csak `src/` változásra indul, minden olyan teszthez, aminél futást várunk (vagy ahol a **branch** szűrőt akarjuk ellenőrizni), az `src/` alatt is kell változtatni valamit. Erre a legbiztonságosabb egy komment az `src/App.jsx` elején, mert az nem rontja el a teszteket.

| Teszt                 | Teendő                                                    | Elvárt eredmény                         | Eredmény |
| --------------------- | --------------------------------------------------------- | --------------------------------------- | -------- |
| Sikeres futás         | `src/` változás push a `main`-re                          | Lefut, minden lépés zöld                | ✅       |
| Csak docs változás    | Fájl a `docs/` mappában, push a `main`-re                 | **Nem** indul el                        | ✅       |
| Nem `main` branch     | Új branch, `src/` változás, `git push -u origin <branch>` | **Nem** indul el                        | ✅       |
| Push esemény          | Push a `main`-re                                          | „This is a push event” a logban         | ✅       |
| Pull request          | PR a branch-ről a `main`-be                               | „This is a pull request event” a logban | ✅       |
| Skip tests            | `src/` változás, commit üzenet: `... [skip-tests]`        | A „Run tests” lépés kimarad             | ✅       |
| Alapértelmezett érték | Nincs `EXTRA_FLAG`                                        | `EXTRA_FLAG: none`                      | ✅       |

A használt parancsok:

```bash
# Docs teszt
mkdir docs
echo "# Docs" > docs/notes.md
git add docs/notes.md
git commit -m "Add docs folder"
git push

# Nem-main branch + PR teszt
git switch -c feature-test
# ... komment átírása az src/App.jsx-ben ...
git add src/App.jsx
git commit -m "Change src on feature branch"
git push -u origin feature-test
# GitHub: Compare & pull request → base: main ← compare: feature-test

# PR merge után
git switch main
git pull
git branch -d feature-test

# Skip tests teszt
# ... komment átírása az src/App.jsx-ben ...
git add src/App.jsx
git commit -m "Update comment [skip-tests]"
git push
```

**Megjegyzés:** a csak a workflow fájlt módosító push sem indítja el a workflow-t, mert az sem az `src/` alatt van.

---

## Buktatók és hibaelhárítás

**YAML: `: ` (kettőspont + szóköz) egy parancsban**
Az `run: echo "Commit SHA: ..."` alak hibás YAML, mert a `: ` kulcs-érték párt jelez. Ha a szerkesztő egyszeres idézőjelek közé teszi a sort, a belső `'none'` lezárja a szöveget, és újra hiba lesz. Megoldás: `run: |` blokk, amiben a sorok nyers szövegként szerepelnek.

**YAML: `!` az `if` elején**
`if: !contains(...)` hibás. Helyesen: `if: ${{ !contains(...) }}`.

**A workflow nem indul el**
Nézd meg, hogy a commit érintette-e az `src/` mappát, és hogy a `main`-re ment-e. A szűrők ÉS kapcsolatban vannak.

**`npm error Cannot read properties of null (reading 'edgesOut')`**
Az npm 10.8.x hibája a friss csomagokkal. Megoldás: Node 24 (npm 11) nvm-mel, majd `rm -rf node_modules package-lock.json && npm install`.

**`git@github.com: Permission denied (publickey)`**
Nincs SSH kulcs a WSL-ben, vagy nincs hozzáadva a GitHubhoz (lásd 2.2).

**A push jelszót vagy tokent kér**
HTTPS-sel lett klónozva. Átállítás:

```bash
git remote set-url origin git@github.com:SziNo/react-test-intermediate-gha.git
```

**`punycode` / `url.parse()` DeprecationWarning a logban**
A `setup-node` action belső figyelmeztetései, nem a mi kódunké. Nem okoznak hibát.

**`ubuntu-latest` értesítés új Ubuntu verzióról**
Csak tájékoztatás. Fix környezethez: `runs-on: ubuntu-24.04`.

**Git stash véletlenül**
`git stash list`, majd ugyanazon a branch-en `git stash pop`.

**Branch törlése merge után a GitHubon**
A PR oldalán a **Delete branch** gomb, vagy a branch-ek listájában a kuka ikon. Automatikusan: Settings → General → **Automatically delete head branches**.
