# Mobile Admin Dashboard Integration

## ✅ What's Been Created

I've added **mobile admin dashboard** directly inside your React Native app at:

```
my-expo-app/app/admin/
├── dashboard.tsx          - Admin home with statistics
├── pending-users.tsx      - Approve/reject user registrations
└── pending-documents.tsx  - Verify/reject uploaded documents
```

## 🎯 How It Works

### User Registration Flow:
1. **Driver/Vendor registers** → Status: `pending`
2. **Uploads documents** → Status: `pending verification`
3. **Admin gets notified** → Shows in "Pending Users" list
4. **Admin reviews** → Can approve or reject
5. **User gets activated** → Can start using the app

### Admin Access:
- Admin users can access admin dashboard from mobile app
- Navigate to: `app/admin/dashboard.tsx`
- See all pending registrations
- Verify documents with image preview
- Approve/reject with reasons

## 📱 Features Included

### Dashboard Screen:
- **Statistics Cards**: Pending users, pending documents, active drivers, active vendors
- **Quick Actions**: Tap to navigate to approval screens
- **Pull to Refresh**: Update stats in real-time

### Pending Users Screen:
- **User Cards**: Name, phone, email, type (driver/vendor)
- **Document Status**: Shows verified documents count
- **Actions**: 
  - ✓ Approve - Activates user account
  - ✗ Reject - Blocks account with reason

### Pending Documents Screen:
- **Document Cards**: License, RC, GST certificates
- **Image Preview**: Full-screen document view
- **Actions**:
  - ✓ Verify - Marks document as verified
  - ✗ Reject - Sends back with rejection reason

## 🔗 How to Access

### Option 1: Add to Tab Navigation
Add admin tab in `app/(tabs)/_layout.tsx`

### Option 2: Add to Profile Menu
Add "Admin Dashboard" button in profile for admin users

### Option 3: Direct Navigation
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
// Navigate to admin dashboard
router.push('/admin/dashboard');
```

## 🎨 UI Design

- **Clean Material Design**: Follows your app's design system
- **Color-coded Cards**: 
  - Orange: Pending users
  - Blue: Pending documents
  - Green: Drivers
  - Purple: Vendors
- **Touch-friendly**: Large buttons, easy navigation
- **Responsive**: Works on all screen sizes

## 🔐 Security

- All API calls use JWT authentication
- Admin-only endpoints protected by backend
- Token stored securely in AuthService

## 🚀 Next Steps

1. **Add Admin Detection**: Check user type on login
2. **Add Navigation**: Link admin dashboard to main app
3. **Test Flow**: Register user → Upload docs → Admin approve
4. **Customize**: Adjust colors, labels as needed

## 📝 Example Integration

```typescript
// In your profile or menu screen:
import { useRouter } from 'expo-router';
import AuthService from '@/services/auth';

const ProfileScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const authService = AuthService.getInstance();
    authService.getCurrentUser().then(setUser);
  }, []);

  // Show admin button only for admin users
  {user?.type === 'admin' && (
    <TouchableOpacity 
      onPress={() => router.push('/admin/dashboard')}
    >
      <Text>👨‍💼 Admin Dashboard</Text>
    </TouchableOpacity>
  )}
};
```

## 🎉 Benefits

✅ **All-in-one**: No separate web app needed  
✅ **Mobile-first**: Admins can work from phone  
✅ **Real-time**: Instant approval from anywhere  
✅ **User-friendly**: Simple tap-to-approve interface  
✅ **Integrated**: Uses same backend APIs  

The web admin dashboard (`admin-dashboard/` folder) can be kept as a desktop option, but now you have full mobile admin capabilities! 📱
