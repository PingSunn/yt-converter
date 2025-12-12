// Shared conversion state storage
// In production, consider using Redis or a database

interface ConversionState {
  status: string
  progress: number
  filename?: string
  error?: string
}

class ConversionStore {
  private conversions = new Map<string, ConversionState>()

  get(id: string): ConversionState | undefined {
    return this.conversions.get(id)
  }

  set(id: string, state: ConversionState): void {
    this.conversions.set(id, state)
  }

  delete(id: string): void {
    this.conversions.delete(id)
  }
}

// Singleton instance
export const conversionStore = new ConversionStore()

