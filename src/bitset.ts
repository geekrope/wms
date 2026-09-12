export class Bitset {
    constructor(public data: number[] = []) { }

    public read_bit(index: number) {
        return this.data[index >> 5] & (1 << (index % 32));
    }

    public set_bit(index : number)
    {
        const at = index >> 5;
        while(at >= this.data.length)
        {
            this.data.push(0);
        }
        this.data[at] |= 1 << (index % 32);
    }

    public or(another: Bitset) {
        const len = Math.max(this.data.length, another.data.length)
        const data: number[] = new Array(len);
        for (let idx = 0; idx < len; idx++) {
            data[idx] = (this.data[idx] ?? 0) | (another.data[idx] ?? 0);
        }

        return new Bitset(data);
    }

    public mask() {
        const mask: boolean[] = [];
        for (let idx = 0; idx < this.data.length; idx++) {
            let chunk = this.data[idx];
            let bit = 0;
            while (bit < 32) {
                mask.push((chunk & 1) == 1);
                chunk >>= 1;
                bit++;
            }
        }
        return mask;
    }

    public apply<T>(array: T[]) {
        const result: T[] = [];
        let ptr = 0;
        for (let idx = 0; idx < this.data.length; idx++) {
            let chunk = this.data[idx];
            let bit = 0;
            while (bit < 32) {
                if ((chunk & 1) == 1) {
                    result.push(array[ptr]);
                }
                chunk >>= 1;
                ptr++;
                bit++;
            }
        }
        return result;
    }
}