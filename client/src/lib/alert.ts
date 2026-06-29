import Swal from 'sweetalert2';

export const showAlert = {
  success: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
  },
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg font-semibold' }
    });
  },
  confirm: (title: string, text: string, onConfirm: () => void) => {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg font-semibold',
        cancelButton: 'rounded-lg font-semibold'
      }
    }).then((result) => {
      if (result.isConfirmed) onConfirm();
    });
  },
  loading: (title: string = 'Memproses...') => {
    Swal.fire({
      title,
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
      didOpen: () => {
        Swal.showLoading();
      }
    });
  },
  close: () => {
    Swal.close();
  },
  input: async (title: string, text: string, placeholder?: string) => {
    const { value } = await Swal.fire({
      title,
      text,
      input: 'text',
      inputPlaceholder: placeholder || '',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      inputValidator: (v) => !v ? 'Wajib diisi' : undefined,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg font-semibold',
        cancelButton: 'rounded-lg font-semibold',
      },
    });
    return { value };
  },
};
