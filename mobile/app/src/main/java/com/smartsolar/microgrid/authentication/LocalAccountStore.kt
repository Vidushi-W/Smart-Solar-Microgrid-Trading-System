package com.smartsolar.microgrid.authentication

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * Local account copy for the signed-in user.
 * NIC is the primary key. Registration, profile edits, and deactivation still go to the API.
 */
class LocalAccountStore(context: Context) : SQLiteOpenHelper(
    context.applicationContext,
    "microgrid_accounts.db",
    null,
    1
) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE local_account (
                nic TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                username TEXT,
                role TEXT NOT NULL,
                name TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                account_status TEXT,
                updated_at TEXT
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS local_account")
        onCreate(db)
    }

    fun save(user: AuthenticatedUser) {
        write(
            nic = user.nic.ifBlank { user.userId },
            userId = user.userId,
            username = user.username,
            role = user.role.name,
            name = user.name,
            email = user.email,
            phone = user.contactNumber,
            address = user.address,
            accountStatus = user.accountStatus
        )
    }

    fun save(profile: ProsumerProfile) {
        write(
            nic = profile.nic.ifBlank { profile.userId },
            userId = profile.userId,
            username = profile.nic,
            role = "PROSUMER",
            name = profile.name,
            email = profile.email,
            phone = profile.contactNumber,
            address = profile.address,
            accountStatus = profile.accountStatus
        )
    }

    fun clear() {
        writableDatabase.delete(TABLE, null, null)
    }

    private fun write(
        nic: String,
        userId: String,
        username: String,
        role: String,
        name: String,
        email: String,
        phone: String,
        address: String,
        accountStatus: String
    ) {
        val db = writableDatabase
        db.delete(TABLE, null, null)
        val values = ContentValues().apply {
            put("nic", nic)
            put("user_id", userId)
            put("username", username)
            put("role", role)
            put("name", name)
            put("email", email)
            put("phone", phone)
            put("address", address)
            put("account_status", accountStatus)
            put("updated_at", java.time.Instant.now().toString())
        }
        db.insert(TABLE, null, values)
    }

    private companion object {
        const val TABLE = "local_account"
    }
}
