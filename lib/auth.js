import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await dbConnect();
        
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('No se encontró el usuario');
        }

        const isPasswordCorrect = await user.comparePassword(credentials.password);
        if (!isPasswordCorrect) {
          throw new Error('Contraseña incorrecta');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.name} ${user.surname}`,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'secret-key-estetica-oral-2l-2024',
};
