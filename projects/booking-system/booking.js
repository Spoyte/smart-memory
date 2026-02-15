// Supabase configuration - REPLACE WITH YOUR CREDENTIALS
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Set minimum date to today
document.getElementById('date').min = new Date().toISOString().split('T')[0];

// Form submission
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    const formData = {
        customer_name: form.name.value,
        customer_phone: form.phone.value,
        service: form.service.value,
        appointment_date: form.date.value,
        appointment_time: form.time.value,
        notes: form.notes.value || null,
        status: 'pending'
    };
    
    try {
        const { data, error } = await supabase
            .from('appointments')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        // Show success message
        form.style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
        
        // Send confirmation SMS (optional - requires Twilio integration)
        await sendConfirmationSMS(formData);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Une erreur est survenue. Veuillez réessayer ou nous appeler au 01 60 82 33 53.');
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
});

// Reset form for new booking
function resetForm() {
    const form = document.getElementById('booking-form');
    form.reset();
    form.style.display = 'block';
    document.getElementById('success-message').style.display = 'none';
    
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').style.display = 'inline';
    submitBtn.querySelector('.btn-loading').style.display = 'none';
}

// Optional: Send confirmation SMS via Twilio
async function sendConfirmationSMS(appointment) {
    // This would call a serverless function or edge function
    // For now, just log - implement with Twilio later
    console.log('Would send SMS to:', appointment.customer_phone);
}

// Check available slots (optional enhancement)
async function getAvailableSlots(date) {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .neq('status', 'cancelled');
    
    if (error) return [];
    
    const bookedSlots = data.map(a => a.appointment_time);
    const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
    
    return allSlots.filter(slot => !bookedSlots.includes(slot));
}
