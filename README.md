# React Test Workflow – GitHub Actions gyakorló projekt!

![Test React App](https://github.com/SziNo/react-test-github-actions-workflow/actions/workflows/test.yml/badge.svg)

Egy Vite-tal generált React alkalmazás, amelynek tesztjei minden `main` branch-re érkező push és pull request esetén automatikusan lefutnak GitHub Actionsben.

Ez a README egyben egy lépésről lépésre követhető leírás is: ha egy hasonló projektet nulláról kell felállítani, az itt leírt sorrendben végig lehet menni rajta.

## Technológiák

| Eszköz                           | Verzió | Mire való                                       |
| -------------------------------- | ------ | ----------------------------------------------- |
| Node.js (nvm-mel kezelve)        | 24 LTS | JavaScript futtatókörnyezet                     |
| Vite                             | 8      | Projektgenerálás, fejlesztői szerver, build     |
| React                            | 19     | UI könyvtár                                     |
| Vitest                           | 5      | Tesztfuttató (a Vite „saját” Jest-megfelelője)  |
| React Testing Library + jest-dom | –      | Komponensek renderelése és ellenőrzése tesztben |
| jsdom                            | –      | Szimulált böngésző Node alatt                   |
| GitHub Actions                   | –      | CI: a tesztek automatikus futtatása             |

Fejlesztői környezet: WSL2, Ubuntu 24.

---

## 1. Egyszeri környezetbeállítás (WSL2)

Ezeket a lépéseket gépenként csak egyszer kell elvégezni.

### 1.1 Git azonosító

```bash
git config --global user.name "Neved"
git config --global user.email "te@emailed.hu"
```

### 1.2 SSH kulcs a GitHubhoz

A WSL-nek saját `~/.ssh` mappája van, a Windows alatti kulcsok itt nem számítanak.

```bash
ssh-keygen -t ed25519 -C "te@emailed.hu"   # Enter az útvonalnál
cat ~/.ssh/id_ed25519.pub                  # ezt a sort kell kimásolni
```

A kimásolt publikus kulcsot a GitHubon a **Settings → SSH and GPG keys → New SSH key** menüpontban kell hozzáadni. Ellenőrzés:

```bash
ssh -T git@github.com
# Hi <felhasználónév>! You've successfully authenticated, but GitHub does not provide shell access.
```

Az első csatlakozáskor a gép rákérdez a GitHub fingerprintjére. Ha az ED25519 kulcs `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`, akkor `yes`.

> A privát kulcsot (`id_ed25519`, `.pub` nélkül) soha nem adjuk ki senkinek, semmilyen lab vagy külső oldal számára sem.

### 1.3 Node.js telepítése nvm-mel

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
nvm alias default 24
node -v   # v24.x.x
npm -v    # 11.x.x
```

Hasznos nvm parancsok:

```bash
nvm ls              # telepített verziók
nvm use 22          # váltás az aktuális terminálban
nvm alias default 24  # alapértelmezett verzió
nvm use             # a projekt .nvmrc fájljában megadott verzióra vált
```

---

## 2. Repó létrehozása és klónozása

1. A GitHubon új repó létrehozása, az **Add a README file** opció bepipálásával.
2. Klónozás **SSH-s** címmel (a „Code” gomb → SSH fül):

```bash
git clone git@github.com:SziNo/react-test-github-actions-workflow.git
cd react-test-github-actions-workflow
```

**Miért SSH és nem HTTPS?** Klónozni mindkettővel lehet, de HTTPS-en a push Personal Access Tokent kérne. SSH-val a beállított kulcs elintézi az azonosítást.

**Kell-e `git remote add` és `git push -u`?** Klónozás után nem: a `git clone` beállítja az `origin` remote-ot, és a `main` már követi az `origin/main`-t. Ellenőrzés: `git remote -v` és `git branch -vv`. A `-u` csak akkor kell, ha egy **új, csak helyben létező branch-et** pusholunk először (`git push -u origin branch-neve`), vagy ha `git init`-tel helyben indítottuk a repót.

---

## 3. React app generálása Vite-tal

A repó mappájában:

```bash
npm create vite@latest . -- --template react
```

A `.` miatt az aktuális mappába generál. A kérdésekre adott válaszok:

| Kérdés                          | Válasz                                                |
| ------------------------------- | ----------------------------------------------------- |
| Ok to proceed?                  | `y`                                                   |
| Current directory is not empty  | **Ignore files and continue** (így megmarad a README) |
| Which linter to use?            | ESLint                                                |
| Install with npm and start now? | No (kézzel csináljuk)                                 |

Telepítés és próbaindítás:

```bash
npm install
npm run dev     # http://localhost:5173/  →  leállítás: Ctrl+C
```

---

## 4. Tesztkörnyezet: Vitest + React Testing Library

### 4.1 Csomagok

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 4.2 `vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom", // szimulált böngésző
    globals: true, // a Testing Library automatikus takarításához kell
    setupFiles: "./src/setupTests.js",
  },
});
```

### 4.3 `src/setupTests.js`

```js
import "@testing-library/jest-dom/vitest";
```

Minden teszt előtt lefut, és bekapcsolja az olyan ellenőrzéseket, mint a `toBeInTheDocument()`.

### 4.4 Teszt script a `package.json`-ban

```json
"test": "vitest run"
```

A `run` miatt a Vitest egyszer lefut és kilép, nem marad watch módban. Így lokálisan és a CI-ban is ugyanúgy viselkedik.

### 4.5 `src/App.test.jsx`

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

Megjegyzések:

- A teszt szövegeit mindig az aktuális `App.jsx`-hez kell igazítani, mert a Vite sablon időnként változik (régen „Vite + React” volt a főcím, most „Get started”).
- A `getByRole` úgy keres, ahogy egy felhasználó „látja” az oldalt (gomb, főcím), ezért nem törik el CSS-átírástól.
- A `describe`, `it` és `expect` explicit importja miatt az ESLint nem jelez `'describe' is not defined` hibát.

### 4.6 Futtatás

```bash
npm test        # Tests  3 passed (3)
npm run lint    # ha nem ír ki semmit, nincs hiba
```

---

## 5. Node verzió rögzítése: `.nvmrc`

```bash
echo "24" > .nvmrc
```

Ebből olvassa a verziót a projekt mappájában az `nvm use`, és a workflow is. Így a Node verzió egyetlen helyen van megadva.

---

## 6. A GitHub Actions workflow

Fájl: `.github/workflows/test.yml`

```yaml
name: Test React App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository code
        uses: actions/checkout@v5

      - name: Set up Node.js
        uses: actions/setup-node@v5
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
```

Mi micsoda:

| Elem                       | Jelentés                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `name`                     | A workflow neve az Actions fülön.                                                            |
| `on.push.branches`         | Lefut, ha a `main`-re pusholunk.                                                             |
| `on.pull_request.branches` | Lefut, ha egy PR a `main`-be akar beolvadni (a `main` itt a **cél** branch).                 |
| `jobs.test`                | A job azonosítója (szabadon választható név).                                                |
| `runs-on`                  | A GitHub egy friss Ubuntu virtuális gépet ad hozzá.                                          |
| `steps`                    | A lépések listája, minden `-` egy új lépés.                                                  |
| `uses`                     | Kész action meghívása; a `@v5` a fő verzió (a Marketplace-en érdemes megnézni a legújabbat). |
| `with`                     | Az action paraméterei.                                                                       |
| `node-version-file`        | A `.nvmrc`-ből olvassa a Node verziót (helyette lehetne `node-version: '24'` is).            |
| `cache: 'npm'`             | Gyorsítótárazza a csomagokat, így a későbbi futások gyorsabbak.                              |
| `run`                      | Sima shell parancs a runneren.                                                               |

**Fontos:** a tömbös forma, az `on: [push, pull_request]` is működik, de abban nem lehet branch-et megadni, így minden branch-re lefutna.

**Fontos:** üres vagy félkész workflow fájlt nem pusholunk, mert a GitHub „Invalid workflow file” hibát jelez rá.

---

## 7. A workflow ellenőrzése

| Teszt         | Teendő                                                                      | Elvárt eredmény                                                   |
| ------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Sikeres futás | Push a `main`-re.                                                           | Zöld pipa az Actions fülön.                                       |
| Bukó futás    | Egy tesztben szándékosan hibás elvárás (pl. `'Count is 2'`), majd push.     | Piros X, a hibaüzenet és a hibás sor annotációként is megjelenik. |
| Pull request  | Új branch, változtatás, `git push -u origin <branch>`, majd PR a `main`-be. | A workflow a PR oldalán is lefut („Checks”).                      |

**Miért bukik a workflow, ha bukik egy teszt?** A Vitest hibás teszt esetén 1-es kilépési kóddal áll le. A GitHub Actions minden lépésnél a kilépési kódot figyeli: a 0 siker, minden más hiba, ami az egész jobot pirosra állítja.

A Vitest GitHub Actionsben magától is ír egy „Vitest Test Report” összefoglalót a futás oldalára.

---

## Hibaelhárítás

**`npm error Cannot read properties of null (reading 'edgesOut')`**
Az npm 10.8.x hibája a peer dependency-k feloldásánál, a friss csomagokkal (React 19, Vite 8, ESLint 10) jön elő. A cache törlése nem segít. Megoldás: Node 24 (npm 11) nvm-mel, majd tiszta telepítés:

```bash
rm -rf node_modules package-lock.json
npm install
```

Végső esetben: `npm install --legacy-peer-deps`.

**Node 20:** 2026 áprilisa óta EOL (nem kap frissítést), ezért Node 24-et használunk lokálisan és a CI-ban is.

**`git@github.com: Permission denied (publickey)`**
A WSL-ben nincs SSH kulcs, vagy nincs hozzáadva a GitHubhoz. Lásd az 1.2 pontot.

**A push jelszót vagy tokent kér**
HTTPS-sel lett klónozva a repó. Átállítás SSH-ra:

```bash
git remote set-url origin git@github.com:SziNo/react-test-github-actions-workflow.git
```

**ESLint: `'describe' is not defined`**
Importáld a tesztfájlban: `import { describe, it, expect } from 'vitest'`.

**WSL: lassú `npm install`**
A projektet a Linux fájlrendszeren (`~/...`) kell tartani, nem a `/mnt/c/...` alatt.

**Forkolt repóban nem futnak a workflow-k**
Forkban alapból le vannak tiltva: az Actions fülön egyszer engedélyezni kell. A fork leválasztható: Settings → General → Danger Zone → **Leave fork network**.

**`ubuntu-latest` értesítés új Ubuntu verzióról**
Csak tájékoztatás. Ha fix környezet kell: `runs-on: ubuntu-24.04`.

---

## Tipp: újrafelhasználás sablonként

A repó beállításaiban (Settings → General) bepipálható a **Template repository** opció. Utána a „Use this template” gombbal egy kattintással új repó készíthető, amiben már benne van a React app, a tesztek és a workflow, így a következő GitHub Actions gyakorlás egyből a lényeggel kezdhető.
