export const CONSTELLATIONS = [
    {
        name: "Orion",
        // [ra1, dec1, ra2, dec2]
        lines: [
            // Orion's belt
            [83.0017, -0.2991, 84.0534, -1.2019], // Alnitak -> Alnilam
            [84.0534, -1.2019, 85.1897, -1.9426], // Alnilam -> Mintaka

            // Belt to shoulders and legs (stylized, not catalog-perfect)
            [78.6345, -8.2016, 83.0017, -0.2991], // Rigel -> Alnitak
            [85.1897, -1.9426, 88.7929, 7.4071],  // Mintaka -> Betelgeuse
            [78.6345, -8.2016, 81.2828, -17.9559], // Rigel -> Saiph
            [81.2828, -17.9559, 83.0017, -0.2991], // Saiph -> Alnitak
        ],
    },
    {
        name: "Ursa Major (Big Dipper)",
        lines: [
            // Big Dipper bowl
            [165.4600, 56.3824, 165.9321, 61.7508], // Dubhe -> Merak
            [165.9321, 61.7508, 168.5269, 60.7167], // Merak -> Phecda
            [168.5269, 60.7167, 177.2649, 65.7160], // Phecda -> Megrez

            // Handle
            [177.2649, 65.7160, 183.8560, 57.0326], // Megrez -> Alioth
            [183.8560, 57.0326, 188.4356, 55.9598], // Alioth -> Mizar
            [188.4356, 55.9598, 193.5073, 55.9598], // Mizar -> Alkaid
        ],
    },
];