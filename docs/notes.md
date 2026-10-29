# GitHub Actions – jegyzetek és 1on1 felkészítő

Ez a jegyzet két célt szolgál. Egyrészt az 1on1 előtti átismétlést: a két elkészült workflow végigvezetését és a várható kérdésekre adott válaszokat. Másrészt rövid bevezetőként is olvasható annak, aki most ismerkedik a GitHub Actionsszel.

A két feladat:

1. **Basic React Test Workflow**: a tesztek automatikus futtatása push és pull request esetén.
2. **Intermediate React Test Workflow**: event filterek, context, változók, feltételes lépések és kifejezések.

---

## 1. Alapfogalmak egy bekezdésben

A **GitHub Actions** a GitHub beépített CI/CD rendszere. Egy **workflow** egy YAML fájl a `.github/workflows/` mappában. Egy **esemény** (event) indítja el, például egy push vagy egy pull request. A workflow egy vagy több **jobból** áll, minden job egy **runneren** (virtuális gépen) fut, és **lépésekből** (steps) épül fel. Egy lépés vagy egy shell parancs (`run`), vagy egy kész, újrafelhasználható **action** (`uses`).

```
Event (push, pull_request…)
  └── Workflow (.github/workflows/test.yml)
        └── Job (runs-on: ubuntu-latest)  →  saját runner / VM
              ├── Step: uses: actions/checkout
              ├── Step: uses: actions/setup-node
              ├── Step: run: npm install
              └── Step: run: npm test
```

---

## 2. Végigvezetés: Basic workflow

### A fájl

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

### Hogyan mondanám el (felülről lefelé)

1. **„Ez egy CI workflow, ami minden `main`-re érkező push és minden `main`-be irányuló pull request esetén lefuttatja a React app tesztjeit.”**
2. **`name`**: ez jelenik meg az Actions fülön.
3. **`on`**: két esemény indítja, a push és a pull request, mindkettő a `main` branch-re szűrve. A kulcsos formát azért használtam, mert a tömbös `on: [push, pull_request]` formában nem lehet branch-et megadni.
4. **`jobs.test`**: egyetlen job, a `test` a szabadon választott azonosítója. A `runs-on: ubuntu-latest` egy friss, GitHub által üzemeltetett Ubuntu VM-et kér.
5. **Checkout**: a runner üresen indul, a repó kódja nincs rajta. Ez a lépés klónozza le, ezért van legelöl. Nélküle a többi lépés nem találná a `package.json`-t.
6. **Setup Node**: a runneren lévő Node verziója nem garantált, ez telepíti a kívánt verziót. A `.nvmrc`-ből olvassa (24), így lokálisan és a CI-ban ugyanaz a verzió fut, egyetlen helyen megadva. A `cache: 'npm'` a futások között megőrzi a letöltött csomagokat, ettől gyorsabb.
7. **`npm install`**: a függőségek telepítése (a feladat ezt kérte; a CI-ban jobb az `npm ci`, lásd lent).
8. **`npm test`**: a Vitest lefuttatja a teszteket. A script `vitest run`, így egyszer fut és kilép, nem marad watch módban.

### Hogyan dönti el a workflow, hogy sikeres-e?

Minden lépés kilépési kódját (exit code) figyeli: a `0` siker, minden más hiba. Ha egy teszt bukik, a Vitest `1`-gyel lép ki, a lépés piros lesz, a job és a workflow is. Ezt élesben teszteltem: egy szándékosan elrontott elvárásnál (`'Count is 2'`) a workflow piros lett, és a Vitest a hibás sort annotációként is beküldte a GitHubnak.

### Döntések és indoklásuk

| Döntés                              | Miért                                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vite** a Create React App helyett | A CRA 2025 óta hivatalosan elavult. A Vite a mai standard; a tesztelőt (Vitest + Testing Library) nekem kellett hozzáadni, ebből többet is tanultam.              |
| **Node 24**                         | A Node 20 2026 áprilisában EOL lett, és a hozzá tartozó npm 10.8 egy hibával (`edgesOut`) nem tudta telepíteni a friss csomagokat. A Node 24 (npm 11) megoldotta. |
| **`.nvmrc`**                        | A Node verzió egyetlen helyen van megadva a gépemhez (nvm) és a CI-hoz (`setup-node`).                                                                            |
| **`cache: 'npm'`**                  | Gyorsabb futások.                                                                                                                                                 |
| **`vitest run`**                    | Egyszer fut és kilép; lokálisan és CI-ban azonosan viselkedik.                                                                                                    |
| **`getByRole` a tesztekben**        | Úgy keres, ahogy a felhasználó látja az oldalt; CSS-átírástól nem törik.                                                                                          |

---

## 3. Végigvezetés: Intermediate workflow

### A fájl

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

### Hogyan mondanám el, szakaszonként

**Event filterek.** „Az alap workflow-t úgy szűkítettem, hogy csak akkor fusson, ha a `main`-re érkezik a változás **és** az `src/` mappában változott valami. A `src/**` az `src` mappát és minden almappáját jelenti. Így egy README vagy `docs/` módosítás nem pazarol CI-időt, hiszen az nem érinti a kódot.”

**Context.** „Három lépés kiírja a `github` contextből a futás adatait: a `github.ref`-et (push-nál `refs/heads/main`, PR-nál `refs/pull/1/merge`), a `github.sha`-t és a `github.event_name`-et. Mellé tettem a `github.ref_name`-et is, mert az a rövid, olvashatóbb branch-név.”

**Változók.** „Mindhárom szinten definiáltam egy `env` változót: `APP_NAME` a workflow, `NODE_VERSION` a job, `TEST_FLAG` a step szintjén. A `TEST_FLAG` azért van pont a kiíró lépésben, mert a step szintű változó csak abban az egy lépésben látszik.”

**`NODE_VERSION: "18"`.** „A feladat ezt az értéket kérte, ezért létrehoztam és kiírom, de a `setup-node`-ban nem ezt használom, mert a Vite 8-nak legalább Node 20.19 kell, és a 18 EOL. A valódi verzió a `.nvmrc`-ből jön, a logban látszik is: `Resolved .nvmrc as 24`.”

**Feltételek.** „Két lépés az esemény típusától függően fut: push-nál a „This is a push event”, PR-nál a „This is a pull request event”. A teszt lépés pedig kimarad, ha a commit üzenetben `[skip-tests]` szerepel. A kihagyott lépés szürke, áthúzott ikonnal jelenik meg, és a workflow zöld marad.”

**Alapértelmezett érték.** „Az `EXTRA_FLAG` sehol nincs beállítva, ezért a `${{ env.EXTRA_FLAG || 'none' }}` kifejezés `none`-t ad. Így a kimenet sosem üres, mindig értelmes érték jelenik meg.”

### Döntések, buktatók, amikből tanultam

| Helyzet                                       | Mit tanultam                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run: echo "Commit SHA: ..."` hibát adott     | A YAML-ben a `: ` kulcs-érték párt jelez. Megoldás: `run: \|` blokk, amiben a sorok nyers szövegként szerepelnek. Az egyszeres idézőjel nem jó, mert a belső `'none'` lezárná. |
| `if: !contains(...)`                          | A `!` a YAML-ben speciális karakter, ezért itt kötelező a `${{ }}`. Egyébként az `if` magától kifejezés, ott elhagyható.                                                       |
| PR-nál a `github.ref` `refs/pull/1/merge`     | A GitHub egy ideiglenes merge commitot készít (PR branch + `main`), és azt teszteli, vagyis a mergelés **utáni** állapotot. Ezért más a SHA is.                                |
| `head_commit` PR-nál                          | Csak push eseménynél létezik. PR-nál üres, így a `contains` hamis, a teszt lefut.                                                                                              |
| A workflow fájl pusholása nem indított futást | A `.github/` nincs az `src/` alatt, a `paths` szűrő pont ezt csinálja.                                                                                                         |

### Hogyan teszteltem

Minden olyan teszthez, ahol futást vártam, vagy ahol a **branch** szűrőt akartam ellenőrizni, az `src/`-ben is változtattam (egy komment az `App.jsx`-ben). Különben a `paths` szűrő akadályozta volna meg a futást, és nem tudtam volna, melyik szűrő működik.

| Teszt                               | Eredmény                                 |
| ----------------------------------- | ---------------------------------------- |
| `src/` változás push a `main`-re    | lefutott, zöld                           |
| csak `docs/` változás               | nem indult el                            |
| `src/` változás egy másik branch-en | nem indult el                            |
| PR a `main`-be                      | lefutott, „This is a pull request event” |
| commit `[skip-tests]` üzenettel     | a teszt lépés kimaradt                   |
| nincs `EXTRA_FLAG`                  | `EXTRA_FLAG: none`                       |

---

## 4. Témakörök

### 4.1 Event filterek

**Mik ezek?** Szűrők az `on` alatt, amelyek eldöntik, hogy egy esemény ténylegesen elindítsa-e a workflow-t. Fajtái:

| Szűrő                          | Mire                                         | Példa               |
| ------------------------------ | -------------------------------------------- | ------------------- |
| `branches` / `branches-ignore` | push: a pusholt branch; PR: a **cél** branch | `branches: [main]`  |
| `tags` / `tags-ignore`         | tag pusholása                                | `tags: ['v*']`      |
| `paths` / `paths-ignore`       | a megváltozott fájlok útvonala               | `paths: ['src/**']` |

**Miért hasznosak?** Spórolnak a CI-idővel és a percekkel, gyorsabb a visszajelzés, és nem fut feleslegesen semmi, például dokumentáció módosításakor.

**Mikor `paths-ignore`?** Ha szinte minden változásra futnia kell, csak néhány dologra nem. Például: `paths-ignore: ['docs/**', '**.md']`. A `paths` akkor jó, ha pontosan tudom, mely mappák számítanak (whitelist); a `paths-ignore`, ha inkább azt tudom, mi nem számít (blacklist). Ugyanarra az eseményre a kettő együtt nem adható meg; ilyenkor a `paths`-ban a `!` előtagos minta használható kizárásra.

**Mikor `branches`?** Ha csak bizonyos branch-ekre kell futnia: például a deploy csak a `main`-re, a tesztek csak a `main`-be irányuló PR-okra, vagy a `release/**` branch-ekre.

**Az ÉS feltétel.** Egy eseményen **belül** a szűrők ÉS kapcsolatban vannak: a `branches` **és** a `paths` feltételnek is teljesülnie kell. Az események **között** VAGY kapcsolat van: a workflow push **vagy** pull request esetén is indulhat.

### 4.2 Contexts

A context egy objektum, amit a `${{ }}` kifejezésekben érhetünk el, és a futásról, a környezetről vagy a konfigurációról ad információt.

**A `github` context** az eseményről és a futásról szól. Gyakori mezők:

| Mező                                  | Tartalom                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `github.ref`                          | a teljes hivatkozás: `refs/heads/main`, `refs/tags/v1.0`, `refs/pull/1/merge`    |
| `github.ref_name`                     | a rövid név: `main`                                                              |
| `github.sha`                          | a commit SHA, amin a workflow fut                                                |
| `github.event_name`                   | az esemény: `push`, `pull_request` stb.                                          |
| `github.event`                        | az esemény teljes adattartalma (payload), pl. `github.event.head_commit.message` |
| `github.actor`                        | aki a futást kiváltotta                                                          |
| `github.repository`                   | `tulajdonos/repó`                                                                |
| `github.head_ref` / `github.base_ref` | PR-nál a forrás és a cél branch                                                  |
| `github.run_id` / `github.run_number` | a futás azonosítója és sorszáma                                                  |

**Mikor `env` context?** Ha egy `env`-ben definiált változót kifejezésen belül akarok használni, például egy `if`-ben (`if: env.DEPLOY == 'true'`) vagy egy action `with` paraméterében. A `run` parancsokban a változó shell-változóként is elérhető (`$APP_NAME`).

**`secrets` context.** Titkos értékek elérésére: jelszavak, API kulcsok, tokenek (`${{ secrets.AWS_ROLE_ARN }}`). A repó beállításaiban tárolódnak titkosítva, a logokban maszkolva jelennek meg (`***`). Van egy automatikus is: a `GITHUB_TOKEN`, amivel a workflow a saját repójához fér hozzá.

**További contextek:** `vars` (konfigurációs változók), `job`, `steps` (korábbi lépések kimenetei: `steps.<id>.outputs`), `runner` (pl. `runner.os`), `matrix`, `needs` (más jobok kimenetei), `inputs`.

**Biztonsági megjegyzés:** a felhasználó által befolyásolható context értékeket (PR címe, commit üzenet, branch-név) **nem** szabad közvetlenül `${{ }}`-vel a `run` parancsba illeszteni, mert így kód injektálható a shellbe. Biztonságosabb `env`-ben átadni, és shell-változóként használni. Nálunk a commit üzenet csak az `if`-ben szerepel, nem futtatott parancsban, így ott nincs gond.

### 4.3 Változók

**`env` vs. `vars`:**

|                  | `env`                                                  | `vars`                                                                                                                               |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hol definiáljuk? | magában a YAML fájlban (workflow / job / step szinten) | a GitHub felületén: Settings → Secrets and variables → Actions → Variables (repó, organization vagy environment szinten)             |
| Elérés           | `${{ env.NEV }}` vagy shellben `$NEV`                  | `${{ vars.NEV }}`                                                                                                                    |
| Mikor?           | a workflow-hoz tartozó, kódban verziózott értékek      | olyan konfiguráció, amit több workflow közösen használ, vagy amit kódmódosítás nélkül akarok változtatni (pl. régió, környezet neve) |
| Titkos?          | nem                                                    | nem (titkos értékhez: `secrets`)                                                                                                     |

**Precedencia:** mindig a **legspecifikusabb** szint nyer: **step > job > workflow**. Ha ugyanaz a változó mindhárom szinten definiált, egy lépésen belül a step szintű értéke látszik, ennek hiányában a job szintű, végül a workflow szintű. A felülírás csak az adott hatókörön belül érvényes; a többi lépés továbbra is a magasabb szintű értéket látja.

A `vars`-nál hasonló a logika: az environment szintű felülírja a repó szintűt, az pedig az organization szintűt.

**Bónusz:** a GitHub automatikusan is beállít környezeti változókat, például `GITHUB_SHA`, `GITHUB_REF`. A `${{ github.sha }}` kifejezést a GitHub a parancs futtatása **előtt** helyettesíti be, a `$GITHUB_SHA` viszont a shellben, **futás közben** értékelődik ki. Az eredmény ugyanaz.

### 4.4 Expressions

**Mik ezek?** A `${{ ... }}` közötti kifejezések, amelyeket a GitHub értékel ki, mielőtt a lépés lefutna. Használhatók contextek, literálok, operátorok és függvények.

**Operátorok:** `==`, `!=`, `<`, `>`, `&&`, `||`, `!`, zárójelek.

**Gyakori függvények:**

| Függvény                                            | Mire                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `contains(miben, mit)`                              | tartalmaz-e egy szöveg/tömb egy értéket                                                                                |
| `startsWith()` / `endsWith()`                       | kezdődik / végződik-e valamivel                                                                                        |
| `format()`                                          | szöveg összeállítása                                                                                                   |
| `toJSON()` / `fromJSON()`                           | átalakítás JSON-ból és JSON-ba                                                                                         |
| `success()`, `failure()`, `always()`, `cancelled()` | státuszfüggvények az `if`-ben: pl. `if: failure()` csak hiba esetén fut (értesítés), `if: always()` mindig (takarítás) |

**Az `if` szintaxis:** az `if` értékét a GitHub automatikusan kifejezésként értelmezi, ezért írható így is: `if: github.event_name == 'push'`. Kivétel, ha a kifejezés `!`-lel kezdődik, mert az a YAML-ben speciális karakter: ilyenkor kötelező a `${{ }}`. Az `if` jobra és lépésre is tehető.

**A `contains()` a skip-tests feltételben:** a `contains(github.event.head_commit.message, '[skip-tests]')` igaz, ha a commit üzenetben szerepel a kulcsszó. Elé tett `!`-lel a teszt lépés csak akkor fut, ha a kulcsszó **nincs** benne. Haszna: például egy dokumentációs vagy apró commitnál gyorsan át lehet ugrani a teszteket. (Éles projektben óvatosan, mert így bukó kód is átcsúszhat.) A GitHub beépített `[skip ci]` kulcsszava ehhez képest az **egész workflow-t** kihagyja, a `[skip-tests]` csak a saját `if`-ünk miatt működik, és csak egy lépést hagy ki.

**A `||` alapértelmezett értékként:** a `${{ env.EXTRA_FLAG || 'none' }}` az első „igaz” értéket adja vissza. Ha az `EXTRA_FLAG` üres vagy nincs definiálva, a `'none'` lesz az eredmény. Ugyanígy működik az `&&`: az `a && b || c` egyfajta „ha-akkor-különben” rövidítés.

### 4.5 Third-party actions

**Mik ezek?** Újrafelhasználható, mások által írt építőelemek, amelyeket a `uses: tulajdonos/repó@verzió` formában hívunk meg, és a `with` kulcs alatt paraméterezünk. A GitHub Marketplace-en lehet keresni közöttük. Az `actions/` tulajdonosúak (pl. `actions/checkout`, `actions/setup-node`) a GitHub hivatalos actionjei.

**Miért fontos a megbízható forrás?** Egy action **kódot futtat a mi runnerünkön**, hozzáfér a repónk kódjához, a `GITHUB_TOKEN`-hez és a workflowban elérhető secretekhez. Egy rosszindulatú vagy feltört action ellophatja ezeket. Ilyen ellátási lánc (supply chain) támadás a gyakorlatban is előfordult.

**Jó gyakorlatok:**

- hivatalos vagy **verified creator** jelvényű actionöket használni,
- a verziót rögzíteni; a legbiztonságosabb a teljes **commit SHA**-ra rögzítés, mert egy tag (`@v5`) utólag átirányítható (a futás logjában látszik is, melyik SHA-ra oldotta fel a `@v5`-öt),
- a `GITHUB_TOKEN` jogait a `permissions` kulccsal a minimumra korlátozni,
- a Dependabottal frissen tartani az actionöket.

### 4.6 Runners

**Mi a runner?** A gép (VM vagy konténer), amelyen egy job fut. Minden job saját runnert kap.

|                | GitHub-hosted                                                        | Self-hosted                                         |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| Ki üzemelteti? | a GitHub                                                             | mi magunk (saját szerver, VM, felhő)                |
| Állapot        | minden jobnál friss, tiszta gép, utána megsemmisül                   | megmaradhat a jobok között                          |
| Karbantartás   | nincs, előtelepített eszközökkel jön                                 | a frissítés, a biztonság és a skálázás a mi dolgunk |
| Költség        | percalapú (publikus repóknál ingyenes, privátnál van ingyenes keret) | a saját infrastruktúra költsége                     |

**Mikor self-hosted?**

- ha a jobnak a **belső hálózatban** lévő erőforrást kell elérnie (on-prem adatbázis, privát szerver),
- ha **speciális hardver** vagy szoftver kell (GPU, licencelt eszköz, egyedi OS),
- ha nagyon sok vagy hosszú futás miatt olcsóbb a saját gép, vagy a GitHub-hosted runnerek korlátai (idő, erőforrás) szűkek,
- ha szabályozási okból a kód nem hagyhatja el a cég infrastruktúráját.

**Mikor GitHub-hosted?** Az esetek többségében: nincs karbantartás, mindig tiszta környezet, azonnal használható. Ez a két feladatomnál is így volt.

**Biztonság:** self-hosted runnert **publikus** repóhoz nem ajánlott használni, mert egy forkból érkező pull request tetszőleges kódot futtathatna a saját gépünkön.

---

## 5. Példakérdések, rövid válaszokkal

**Mit csinál az `actions/checkout@v4` (nálam `@v5`), és miért szokott az első lépés lenni?**
Leklónozza a repó kódját a runnerre. A runner üres géppel indul, a kód nélkül a többi lépés (telepítés, teszt) nem találna semmit. Azért nem automatikus, mert nem minden workflow-nak kell a kód, és így paraméterezhető (branch, `fetch-depth`, másik repó). A `@v4` és a `@v5` csak az action fő verziója, a funkciója ugyanaz.

**Miért adtad hozzá a `paths: ['src/**']`-t?**
Hogy a tesztek csak akkor fussanak, ha a forráskód változott. Egy README vagy `docs/`módosítás nem érinti a kódot, felesleges miatta CI-időt használni. Teszteltem is: a`docs/` változásra nem indult el.

**Milyen információt tartalmaz a `github.ref`?**
A workflow-t kiváltó hivatkozás teljes nevét: push-nál `refs/heads/<branch>`, tagnél `refs/tags/<tag>`, PR-nál `refs/pull/<szám>/merge`. Ez utóbbi az ideiglenes merge commit, amit a GitHub a PR teszteléséhez készít.

**Mi történik, ha ugyanazt a változót workflow és job szinten is definiálod?**
A job szintű nyer azon a jobon belül, mert mindig a specifikusabb szint érvényes (step > job > workflow). A többi jobban továbbra is a workflow szintű érték látszik.

**Miért használnád a `contains(github.event.head_commit.message, '[skip-tests]')`-t egy `if`-ben?**
Hogy a commit üzenettel vezérelhető legyen egy lépés, itt a tesztek kihagyása, a workflow módosítása nélkül. `!`-lel negálva a teszt csak akkor fut, ha a kulcsszó nincs benne. Push eseményhez kötött, mert a `head_commit` csak ott létezik.

**Mi a különbség az `env` és a `vars` között?**
Az `env` a YAML-ben definiált, a kóddal együtt verziózott változó, hatókörrel (workflow/job/step). A `vars` a GitHub felületén (repó, organization, environment szinten) tárolt konfigurációs változó, ami kódmódosítás nélkül változtatható, és több workflow is használhatja. Egyik sem titkos.

**Miért secrets és nem sima szöveg az érzékeny adatokhoz?**
A YAML a repóban van: mindenki látja, aki hozzáfér, és a git történetben örökre megmarad, még törlés után is. A secret titkosítva tárolódik, a logokban `***`-ként jelenik meg, a jogosultság szabályozható, és a kód módosítása nélkül cserélhető (rotálható). Forkból érkező PR-ok alapból nem férnek hozzá.

**Mikor használnál self-hosted runnert GitHub-hosted helyett?**
Ha belső hálózatot kell elérni, speciális hardver vagy szoftver kell, nagy volumennél olcsóbb, vagy szabályozás miatt a kód nem hagyhatja el a céget. Cserébe a karbantartás és a biztonság a mi felelősségünk.

**Mi a különbség a step és a job között?**
A **job** egy runneren futó lépéssorozat; a jobok alapból **párhuzamosan**, külön gépeken futnak, a sorrend a `needs` kulccsal adható meg, adatot artifacttal vagy outputtal adhatnak át egymásnak. A **step** egy jobon belüli egyetlen művelet (`run` vagy `uses`); a lépések **sorban**, ugyanazon a gépen futnak, és közös a fájlrendszerük (ezért látja a teszt a checkout által letöltött kódot).

**Miért kifejezéssel adtad meg az `EXTRA_FLAG` alapértelmezett értékét?**
Mert a változó nincs beállítva, és így a kimenet nem üres, hanem értelmes `none`. A `||` az első igaz értéket adja, így egyetlen kifejezés kezeli a „van értéke / nincs értéke” esetet, külön `if` lépések nélkül. Shellben ugyanez `${EXTRA_FLAG:-none}` lenne, de a feladat a GitHub kifejezést kérte, ami a lépés futása előtt értékelődik ki.

---

## 6. Gyakori kérdések, amik még előjöhetnek

**`npm install` vagy `npm ci` a CI-ban?** Az `npm ci` a jobb: szigorúan a `package-lock.json` szerint telepít, hibát dob, ha az nincs szinkronban a `package.json`-nal, tiszta `node_modules`-szal indul, és gyorsabb. Lokálisan új csomaghoz `npm install`.

**Mi az `ubuntu-latest`?** Egy címke, ami a GitHub által aktuálisan „legújabbnak” tekintett Ubuntu image-re mutat, és idővel átáll az újabbra. Ha stabil, fix környezet kell: `runs-on: ubuntu-24.04`.

**Hogyan lehet megnézni, mi történt egy futásban?** Actions fül → futás → job → lépésenként lenyitható logok. A kihagyott lépés szürke, áthúzott ikon; a hibás lépésnél a hibaüzenet és az annotáció is látszik.

**Mi a status badge?** Egy kép a README-ben, ami a workflow legutóbbi futásának állapotát mutatja (`passing` / `failing`). Az URL-je: `https://github.com/<tulaj>/<repo>/actions/workflows/<fájl>.yml/badge.svg`.

---

## 7. Egyperces összefoglaló

„Két workflow-t készítettem egy Vite-os React apphoz. Az első minden `main`-re érkező push-ra és PR-ra lefuttatja a teszteket: checkout, Node beállítás a `.nvmrc` alapján cache-sel, függőségek telepítése, majd a Vitest tesztek. Ha egy teszt bukik, a Vitest nem nulla kilépési kóddal áll le, és a workflow piros lesz; ezt ki is próbáltam.

A második ezt bővíti: `branches` és `paths` szűrőkkel csak akkor fut, ha a `main`-en az `src/` változik, mert a dokumentáció módosítása nem igényel tesztelést. A `github` contextből kiírja a ref-et, a SHA-t és az eseményt. Mindhárom szinten van `env` változó, ahol a specifikusabb nyer. `if` feltételekkel az esemény típusa szerint futnak lépések, a `[skip-tests]` kulcsszó pedig kihagyja a teszteket. Az `EXTRA_FLAG`-nek `||` operátorral adtam alapértelmezett értéket.

Minden esetet élesben teszteltem, és közben a YAML néhány csapdájával is találkoztam, például a `: ` és a `!` speciális jelentésével.”
