export interface VehicleLookupResult {
  brand: string;
  model: string;
  color?: string;
  category: 'pequeno' | 'medio' | 'grande' | 'moto';
}

// Base de Dados de Categorização por Modelo (para o Autocomplete e Validação)
export const VEHICLE_DATABASE: Record<string, { brand: string; category: 'pequeno' | 'medio' | 'grande' | 'moto' }[]> = {
  Chevrolet: [
    { brand: 'Chevrolet', category: 'pequeno' }, // Onix, Celta, Corsa
    { brand: 'Chevrolet', category: 'medio' },   // Cruze, Tracker, Spin
    { brand: 'Chevrolet', category: 'grande' },  // S10, Trailblazer
  ],
  Fiat: [
    { brand: 'Fiat', category: 'pequeno' }, // Uno, Palio, Mobi, Argo
    { brand: 'Fiat', category: 'medio' },   // Cronos, Fastback, Pulse
    { brand: 'Fiat', category: 'grande' },  // Toro, Ducato
  ],
  Volkswagen: [
    { brand: 'Volkswagen', category: 'pequeno' }, // Gol, Polo, Up, Fox
    { brand: 'Volkswagen', category: 'medio' },   // Virtus, T-Cross, Nivus
    { brand: 'Volkswagen', category: 'grande' },  // Amarok, Taos, Tiguan
  ],
  Honda: [
    { brand: 'Honda', category: 'pequeno' }, // Fit, City Hatch
    { brand: 'Honda', category: 'medio' },   // Civic, HR-V, WR-V
    { brand: 'Honda', category: 'grande' },  // CR-V
  ],
  Toyota: [
    { brand: 'Toyota', category: 'pequeno' }, // Yaris Hatch, Etios
    { brand: 'Toyota', category: 'medio' },   // Corolla, Corolla Cross
    { brand: 'Toyota', category: 'grande' },  // Hilux, SW4, RAV4
  ],
  Jeep: [
    { brand: 'Jeep', category: 'medio' },   // Renegade, Compass
    { brand: 'Jeep', category: 'grande' },  // Commander, Wrangler
  ],
  Hyundai: [
    { brand: 'Hyundai', category: 'pequeno' }, // HB20
    { brand: 'Hyundai', category: 'medio' },   // Creta
    { brand: 'Hyundai', category: 'grande' },  // Tucson, Santa Fe
  ],
  Ford: [
    { brand: 'Ford', category: 'pequeno' }, // Ka, Fiesta
    { brand: 'Ford', category: 'medio' },   // EcoSport, Focus
    { brand: 'Ford', category: 'grande' },  // Ranger, Territory, Maverick
  ],
};

// Mapeamento automático de Categoria com base em palavras-chave no Modelo
export const inferCategoryFromModel = (modelName: string): 'pequeno' | 'medio' | 'grande' | 'moto' => {
  const modelUpper = modelName.toUpperCase();

  // Motos
  if (modelUpper.includes('MOTO') || modelUpper.includes('CG') || modelUpper.includes('BIZ') || modelUpper.includes('CB') || modelUpper.includes('FAZER') || modelUpper.includes('NMAX')) {
    return 'moto';
  }

  // Veículos Grandes (Pickups, SUVs 7L, Vans)
  if (
    modelUpper.includes('HILUX') || modelUpper.includes('SW4') || modelUpper.includes('S10') ||
    modelUpper.includes('RANGER') || modelUpper.includes('TORO') || modelUpper.includes('AMAROK') ||
    modelUpper.includes('TRAILBLAZER') || modelUpper.includes('COMMANDER') || modelUpper.includes('RAM')
  ) {
    return 'grande';
  }

  // Veículos Médios (Sedans, SUVs Compactos)
  if (
    modelUpper.includes('COROLLA') || modelUpper.includes('CIVIC') || modelUpper.includes('COMPASS') ||
    modelUpper.includes('RENEGADE') || modelUpper.includes('TRACKER') || modelUpper.includes('CRETA') ||
    modelUpper.includes('T-CROSS') || modelUpper.includes('NIVUS') || modelUpper.includes('CRONOS') ||
    modelUpper.includes('HR-V') || modelUpper.includes('FASTBACK') || modelUpper.includes('PULSE')
  ) {
    return 'medio';
  }

  // Padrão: Pequeno (Hatchs compactos: Onix, Gol, HB20, Uno, Argo, Polo, etc.)
  return 'pequeno';
};

// Função de Busca por Placa via API Externa Gratuita
export const fetchVehicleByPlate = async (plate: string): Promise<VehicleLookupResult | null> => {
  const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (cleanPlate.length !== 7) {
    throw new Error('A placa deve ter 7 caracteres.');
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/fipe/preco/v1/${cleanPlate}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const item = data[0];
      const brand = item.marca || '';
      const model = item.modelo || '';
      const category = inferCategoryFromModel(model);

      return {
        brand,
        model,
        category,
      };
    }

    return null;
  } catch (error) {
    console.error('Erro na consulta por placa:', error);
    return null;
  }
};