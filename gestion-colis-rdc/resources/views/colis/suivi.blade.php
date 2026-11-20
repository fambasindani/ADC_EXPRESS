<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Suivi {{ $colis?->numero_suivi ?? $numero }} — ADC EXPRESS RDC</title>
    <style>
        * { box-sizing: border-box; }

        :root {
            --rouge: #E51C23;
            --orange: #F7941D;
            --cyan: #2196c9;
            --sombre: #1A1A1A;
            --gris: #64748b;
            --bord: #e2e8f0;
        }

        html { -webkit-text-size-adjust: 100%; }

        body {
            margin: 0;
            background: #f1f5f9;
            color: var(--sombre);
            font-family: "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
            line-height: 1.5;
        }

        .topbar {
            background: var(--sombre);
            color: #fff;
            padding: 18px 0 22px;
        }

        .topbar .wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .brand {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: .01em;
        }

        .brand .rouge { color: var(--rouge); }
        .brand .cyan { color: #5bc8f5; }

        .topbar-sub {
            font-size: 12px;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: .12em;
        }

        .wrap {
            width: 100%;
            max-width: 680px;
            margin: 0 auto;
            padding: 0 16px;
        }

        main.wrap {
            margin-top: -12px;
            padding-bottom: 28px;
        }

        .card {
            background: #fff;
            border: 1px solid var(--bord);
            border-radius: 16px;
            padding: 18px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
            margin-bottom: 14px;
        }

        .eyebrow {
            margin: 0 0 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: #94a3b8;
        }

        h1 {
            margin: 0;
            font-family: "Courier New", monospace;
            font-size: 24px;
            letter-spacing: .03em;
            word-break: break-all;
        }

        .hero-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        h2 {
            margin: 0 0 12px;
            font-size: 15px;
        }

        .badge {
            display: inline-block;
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
        }

        .badge-enregistre { background: #f1f5f9; color: #334155; }
        .badge-en-attente-paiement { background: #fef3c7; color: #b45309; }
        .badge-pret-expedition { background: #dbeafe; color: #1d4ed8; }
        .badge-en-transit { background: #cffafe; color: #0e7490; }
        .badge-arrive-agence { background: #e0e7ff; color: #4338ca; }
        .badge-en-livraison { background: #ede9fe; color: #6d28d9; }
        .badge-livre,
        .badge-retire { background: #d1fae5; color: #047857; }
        .badge-annule,
        .badge-perdu { background: #fee2e2; color: #b91c1c; }
        .badge-endommage { background: #ffedd5; color: #c2410c; }
        .badge-retour { background: #ffe4e6; color: #be123c; }

        /* ---------- Progression ---------- */
        .steps {
            display: flex;
            margin: 22px 0 4px;
            padding: 0;
            list-style: none;
        }

        .step {
            position: relative;
            flex: 1;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            line-height: 1.25;
        }

        .step::before {
            content: "";
            position: absolute;
            top: 7px;
            left: 0;
            width: 100%;
            height: 3px;
            background: #e2e8f0;
        }

        .step:first-child::before { left: 50%; width: 50%; }
        .step:last-child::before { width: 50%; }

        .step .dot {
            position: relative;
            display: block;
            width: 17px;
            height: 17px;
            margin: 0 auto 6px;
            border-radius: 50%;
            background: #fff;
            border: 3px solid #cbd5e1;
        }

        .step.done { color: #047857; }
        .step.done::before { background: #10b981; }
        .step.done .dot { background: #10b981; border-color: #10b981; }

        .step.active { color: var(--rouge); font-weight: 700; }
        .step.active::before { background: #10b981; }
        .step.active .dot {
            background: var(--rouge);
            border-color: #fecaca;
            box-shadow: 0 0 0 4px rgba(229, 28, 35, .14);
        }

        .step.is-last.done .dot,
        .step.is-last.active .dot { background: #047857; border-color: #a7f3d0; }

        /* ---------- Trajet ---------- */
        .route {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid var(--bord);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 14px;
        }

        .route .col { flex: 1; min-width: 0; }
        .route .col.droite { text-align: right; }

        .route .code {
            display: block;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.2;
        }

        .route .nom {
            display: block;
            font-size: 12px;
            color: var(--gris);
        }

        .route .fleche {
            flex: none;
            font-size: 20px;
            color: var(--rouge);
            font-weight: 700;
        }

        dl.details {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px 16px;
            margin: 0;
        }

        dl.details div { min-width: 0; }

        dl.details dt {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: #94a3b8;
            margin-bottom: 2px;
        }

        dl.details dd {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }

        /* ---------- Historique ---------- */
        .timeline {
            list-style: none;
            margin: 0;
            padding: 0 0 0 22px;
            border-left: 2px solid var(--bord);
        }

        .timeline li {
            position: relative;
            padding: 0 0 18px 4px;
        }

        .timeline li:last-child { padding-bottom: 0; }

        .timeline li::before {
            content: "";
            position: absolute;
            left: -30px;
            top: 5px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--rouge);
            box-shadow: 0 0 0 3px #fecaca;
        }

        .timeline .entete {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }

        .timeline .date {
            font-size: 12px;
            color: #94a3b8;
        }

        .timeline .agence {
            font-size: 12px;
            color: var(--gris);
        }

        .timeline .commentaire {
            margin: 3px 0 0;
            font-size: 13px;
            color: #475569;
        }

        .notice {
            border-radius: 12px;
            padding: 13px 15px;
            font-size: 14px;
            margin-bottom: 14px;
        }

        .notice.warning {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            color: #9a3412;
        }

        .notice.info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
        }

        .muted { color: var(--gris); font-size: 13px; }

        .privacy {
            margin: 0 0 18px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }

        .notfound { text-align: center; padding: 34px 22px; }

        .notfound .picto {
            width: 54px;
            height: 54px;
            margin: 0 auto 14px;
            border-radius: 50%;
            background: #fee2e2;
            color: var(--rouge);
            font-size: 26px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .notfound h1 { font-family: inherit; font-size: 20px; margin-bottom: 8px; }

        footer {
            padding: 20px 16px 30px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }

        @media (max-width: 420px) {
            h1 { font-size: 20px; }
            dl.details { grid-template-columns: 1fr; }
            .step { font-size: 9px; }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <div class="wrap">
            <div class="brand"><span class="rouge">ADC</span> EXPRESS <span class="cyan">RDC</span></div>
            <div class="topbar-sub">Suivi de colis</div>
        </div>
    </header>

    <main class="wrap">
        @if (! $colis)
            <section class="card notfound">
                <div class="picto">?</div>
                <h1>Colis introuvable</h1>
                <p class="muted">
                    Aucun colis ne correspond au numéro <strong>{{ $numero }}</strong>.
                    Vérifiez le numéro de suivi inscrit sur votre reçu ou sur l'étiquette du colis.
                </p>
            </section>
        @else
            @php
                $courante = \App\Support\StatutColis::etapeCourante($colis->statut);
                $anormal  = \App\Support\StatutColis::estAnormal($colis->statut);
                $poids    = rtrim(rtrim(number_format((float) $colis->poids_kg, 3, ',', ' '), '0'), ',');
            @endphp

            <section class="card">
                <div class="hero-top">
                    <div>
                        <p class="eyebrow">Numéro de suivi</p>
                        <h1>{{ $colis->numero_suivi }}</h1>
                    </div>
                    <span class="badge badge-{{ \App\Support\StatutColis::classe($colis->statut) }}">
                        {{ \App\Support\StatutColis::libelle($colis->statut) }}
                    </span>
                </div>

                @unless ($anormal)
                    <ol class="steps" aria-label="Progression du colis">
                        @foreach (\App\Support\StatutColis::ETAPES as $code => $libelle)
                            @php
                                $index = $loop->index;
                                $etat  = $courante === null ? '' : ($index < $courante ? 'done' : ($index === $courante ? 'active' : ''));
                            @endphp
                            <li class="step {{ $etat }} {{ $loop->last ? 'is-last' : '' }}">
                                <span class="dot"></span>
                                {{ $libelle }}
                            </li>
                        @endforeach
                    </ol>
                @endunless
            </section>

            @if ($colis->statut === 'ANNULE')
                <div class="notice warning">Ce colis a été annulé. Contactez votre agence pour plus d'informations.</div>
            @elseif ($colis->statut === 'RETOUR')
                <div class="notice warning">Ce colis est en retour vers son agence de départ.</div>
            @elseif ($colis->statut === 'PERDU')
                <div class="notice warning">Ce colis est déclaré perdu. Contactez votre agence pour la suite à donner.</div>
            @elseif ($colis->statut === 'ENDOMMAGE')
                <div class="notice warning">Ce colis a été signalé endommagé. Contactez votre agence.</div>
            @endif

            <section class="card">
                <h2>Trajet</h2>
                <div class="route">
                    <div class="col">
                        <span class="badge badge-enregistre">Départ</span>
                        <span class="code">{{ $colis->agenceDepot?->code ?? '—' }}</span>
                        <span class="nom">{{ $colis->agenceDepot?->nom ?? 'Agence inconnue' }}</span>
                    </div>
                    <div class="fleche">&#8594;</div>
                    <div class="col droite">
                        <span class="badge badge-en-livraison">Destination</span>
                        <span class="code">{{ $colis->agenceDestination?->code ?? '—' }}</span>
                        <span class="nom">{{ $colis->agenceDestination?->nom ?? 'Agence inconnue' }}</span>
                    </div>
                </div>

                <dl class="details">
                    <div>
                        <dt>Déposé le</dt>
                        <dd>{{ $colis->date_depot?->format('d/m/Y à H:i') ?? '—' }}</dd>
                    </div>
                    <div>
                        <dt>Arrivée estimée</dt>
                        <dd>{{ $colis->date_estimee_arrivee?->format('d/m/Y') ?? '—' }}</dd>
                    </div>
                    <div>
                        <dt>Arrivé le</dt>
                        <dd>{{ $colis->date_arrivee?->format('d/m/Y à H:i') ?? '—' }}</dd>
                    </div>
                    <div>
                        <dt>Dernière mise à jour</dt>
                        <dd>{{ ($colis->historique->sortByDesc('date_evenement')->first()?->date_evenement ?? $colis->date_depot)?->format('d/m/Y à H:i') ?? '—' }}</dd>
                    </div>
                    <div>
                        <dt>Type de colis</dt>
                        <dd>{{ $colis->typeColis?->libelle ?? '—' }}</dd>
                    </div>
                    <div>
                        <dt>Poids</dt>
                        <dd>{{ $poids !== '' ? $poids . ' kg' : '—' }}</dd>
                    </div>
                </dl>
            </section>

            <section class="card">
                <h2>Historique</h2>
                <ol class="timeline">
                    @forelse ($colis->historique->sortByDesc('date_evenement') as $evenement)
                        <li>
                            <div class="entete">
                                <span class="badge badge-{{ \App\Support\StatutColis::classe($evenement->nouveau_statut) }}">
                                    {{ \App\Support\StatutColis::libelle($evenement->nouveau_statut) }}
                                </span>
                                <span class="date">{{ $evenement->date_evenement?->format('d/m/Y à H:i') }}</span>
                                @if ($evenement->agence)
                                    <span class="agence">{{ $evenement->agence->nom }}</span>
                                @endif
                            </div>
                            @if ($evenement->commentaire)
                                <p class="commentaire">{{ $evenement->commentaire }}</p>
                            @endif
                        </li>
                    @empty
                        <li>
                            <span class="muted">Aucun événement enregistré pour le moment.</span>
                        </li>
                    @endforelse
                </ol>
            </section>

            <p class="privacy">
                Cette page n'affiche aucune donnée personnelle sensible
                (téléphone, adresse, montants).
            </p>
        @endif
    </main>

    <footer>
        ADC EXPRESS RDC — Logistique &amp; Colis<br>
        Page de suivi générée automatiquement.
    </footer>
</body>
</html>
