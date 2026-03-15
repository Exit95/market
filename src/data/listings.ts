// Mock data for Novamarkt listings

export interface Listing {
    id: string;
    title: string;
    price: number;
    location: string;
    category: string;
    image: string;
    sellerName: string;
    sellerRating: number;
    sellerVerified: boolean;
    sellerKYC: boolean;
    postedAt: string;
    condition: 'Neu' | 'Sehr gut' | 'Gut' | 'Akzeptabel';
    treuhandAvailable: boolean;
    description?: string;
    phone?: string;
}

export const categories = [
    { slug: 'elektronik', label: 'Elektronik', icon: '/icons/elektronik.svg', count: 2841 },
    { slug: 'fahrzeuge', label: 'Fahrzeuge', icon: '/icons/fahrzeuge.svg', count: 1923 },
    { slug: 'mode', label: 'Mode & Kleidung', icon: '/icons/mode.svg', count: 3102 },
    { slug: 'moebel', label: 'Möbel & Wohnen', icon: '/icons/moebel.svg', count: 1547 },
    { slug: 'sport', label: 'Sport & Freizeit', icon: '/icons/sport.svg', count: 982 },
    { slug: 'haushalt', label: 'Haushalt', icon: '/icons/haushalt.svg', count: 1238 },
    { slug: 'bucher', label: 'Bücher & Medien', icon: '/icons/bucher.svg', count: 741 },
    { slug: 'spielzeug', label: 'Spielzeug', icon: '/icons/spielzeug.svg', count: 634 },
];


export const listings: Listing[] = [
    {
        id: '1',
        title: 'iPhone 15 Pro Max 256GB – Titanium, wie neu',
        price: 949,
        location: 'Berlin Mitte',
        category: 'Elektronik',
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484429be?w=400&h=300&fit=crop',
        sellerName: 'Klaus M.',
        sellerRating: 4.9,
        sellerVerified: true,
        sellerKYC: true,
        postedAt: 'Heute',
        condition: 'Sehr gut',
        treuhandAvailable: true,
        description: 'Verkaufe mein iPhone 15 Pro Max in einwandfreiem Zustand. Kein Kratzer, immer mit Hülle und Schutzfolie. Originalkarton und Zubehör vollständig vorhanden. Akku 98%. Übergabe persönlich in Berlin Mitte oder Versand per Treuhand möglich.',
    },
    {
        id: '2',
        title: 'IKEA KALLAX Regal 4x4 – weiß',
        price: 79,
        location: 'München Schwabing',
        category: 'Möbel & Wohnen',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
        sellerName: 'Anna S.',
        sellerRating: 4.7,
        sellerVerified: true,
        sellerKYC: false,
        postedAt: 'Gestern',
        condition: 'Gut',
        treuhandAvailable: false,
        description: 'Verkaufe IKEA Kallax Regal 4x4 Felder in weiß. Nur ein Jahr alt, guter Zustand. Selbstabholung in München Schwabing. Abmessungen: 147 x 147 x 39 cm.',
    },
    {
        id: '3',
        title: 'Mountainbike Trek Marlin 7 – RH M, Shimano',
        price: 680,
        location: 'Hamburg Altona',
        category: 'Sport & Freizeit',
        image: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=400&h=300&fit=crop',
        sellerName: 'Thomas B.',
        sellerRating: 5.0,
        sellerVerified: true,
        sellerKYC: true,
        postedAt: 'vor 2 Tagen',
        condition: 'Sehr gut',
        treuhandAvailable: true,
        description: 'Trek Marlin 7 Mountainbike in Rahmengröße M. 29 Zoll Räder, Shimano Deore 12-Gang-Schaltung. Sehr guter Zustand, wenig gefahren. Versand mit Treuhand-Schutz möglich.',
    },
    {
        id: '4',
        title: 'Sony WH-1000XM5 Noise Cancelling Kopfhörer',
        price: 195,
        location: 'Frankfurt a.M.',
        category: 'Elektronik',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
        sellerName: 'Jörg L.',
        sellerRating: 4.5,
        sellerVerified: true,
        sellerKYC: false,
        postedAt: 'vor 3 Tagen',
        condition: 'Sehr gut',
        treuhandAvailable: true,
        description: 'Sony WH-1000XM5 ANC Kopfhörer, schwarz. Kaum benutzt, komplett mit Originalzubehör. Gründe: Umstieg auf In-Ear.',
    },
    {
        id: '5',
        title: 'Vintage Lederjacke – Größe L, Braun',
        price: 55,
        location: 'Köln Ehrenfeld',
        category: 'Mode & Kleidung',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop',
        sellerName: 'Marie K.',
        sellerRating: 4.8,
        sellerVerified: false,
        sellerKYC: false,
        postedAt: 'vor 4 Tagen',
        condition: 'Gut',
        treuhandAvailable: false,
        description: 'Tolle Vintage Lederjacke in Braun, Größe L. Ein paar kleine Gebrauchsspuren die den Charme ausmachen. Echtes Leder.',
    },
    {
        id: '6',
        title: 'PlayStation 5 Digital Edition + 3 Spiele',
        price: 380,
        location: 'Stuttgart Nord',
        category: 'Elektronik',
        image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=300&fit=crop',
        sellerName: 'Felix R.',
        sellerRating: 4.9,
        sellerVerified: true,
        sellerKYC: true,
        postedAt: 'Heute',
        condition: 'Sehr gut',
        treuhandAvailable: true,
        description: 'PS5 Digital Edition im tadellosem Zustand. Inklusive 2 Controller und 3 digitale Spiele (Gran Turismo 7, God of War Ragnarök, FIFA 24). Treuhand-Zahlung möglich.',
    },
    {
        id: '7',
        title: 'Bosch Akkuschrauber Set – GSR 18V-55',
        price: 89,
        location: 'Düsseldorf',
        category: 'Haushalt',
        image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
        sellerName: 'Werner H.',
        sellerRating: 4.6,
        sellerVerified: true,
        sellerKYC: false,
        postedAt: 'vor 5 Tagen',
        condition: 'Gut',
        treuhandAvailable: false,
        description: 'Bosch Akkuschrauber GSR 18V-55 mit 2 Akkus, Ladegerät und Bits-Set in L-BOXX. Wenig benutzt, voll funktionsfähig.',
    },
    {
        id: '8',
        title: 'VW Golf 7 GTI – 2018, 120tkm, Scheckheft',
        price: 18500,
        location: 'Leipzig',
        category: 'Fahrzeuge',
        image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
        sellerName: 'Hans D.',
        sellerRating: 4.7,
        sellerVerified: true,
        sellerKYC: true,
        postedAt: 'Gestern',
        condition: 'Gut',
        treuhandAvailable: true,
        description: 'VW Golf 7 GTI 2.0 TSI, 230 PS, Scheckheftgepflegt. HU neu. Klimaautomatik, Sitzheizung, Navi, LED. Vollkasko bis 2025. Privatverkauf, kein Umtausch.',
    },
];
